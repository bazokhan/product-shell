import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import { configureApiClient, resetApiClient } from "./custom-fetch";
import {
  completeTenantLogin,
  completeTenantLoginWithMfa,
  consumeTenantHandoff,
  HANDOFF_HASH_KEY,
  launchKind,
  launchTargets,
  withHandoff,
} from "./launcher";
import { loadSession, type AuthSession } from "./session";

function session(over: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "a",
    refreshToken: "r",
    tokenType: "Bearer",
    user: { id: "u", email: "a@b.c", name: "A" },
    tenant: { id: "t", slug: "acme", name: "Acme" },
    permissions: ["hr.employees.read"],
    branchIds: [],
    enabledModules: ["HR", "ACCOUNTING"],
    ...over,
  };
}

describe("launcher", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProductShellConfig();
    configureProductShell({ storageKey: "launcher.auth", getBaseUrl: () => "https://api.example/api/v1" });
    resetApiClient();
    configureApiClient({
      getAccessToken: () => loadSession()?.accessToken ?? null,
      refreshAccessToken: async () => null,
      onUnauthorized: () => undefined,
    });
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetApiClient();
    resetProductShellConfig();
    localStorage.clear();
  });

  it("builds cards for sellable modules and ignores طواف and unknown names", () => {
    const targets = launchTargets(["HR", "ACCOUNTING", "OPERATIONS", "TAWAF", "PLATFORM"]);
    expect(targets.map((row) => row.module)).toEqual(["HR", "ACCOUNTING", "OPERATIONS"]);
    expect(targets.some((row) => row.nameAr === "طواف")).toBe(false);
    expect(launchKind(targets)).toBe("many");
  });

  it("sends a single-module tenant straight to that product origin", () => {
    const targets = launchTargets(["OPERATIONS"]);
    expect(launchKind(targets)).toBe("one");
    expect(targets[0]?.origin).toBe("https://rihal.trugraph.io");
  });

  it("has no product when nothing is entitled", () => {
    expect(launchKind(launchTargets([]))).toBe("none");
    expect(launchKind(launchTargets(["TAWAF"]))).toBe("none");
  });

  it("writes a hash handoff the product host can consume without a second login", () => {
    const s = session({ enabledModules: ["HR"] });
    const href = withHandoff("https://hr.trugraph.io", s);
    expect(href.startsWith("https://hr.trugraph.io/#")).toBe(true);
    expect(href.includes("accessToken=a")).toBe(false);
    const hash = href.slice(href.indexOf("#") + 1);
    window.history.replaceState(null, "", `/login#${hash}`);
    const handed = consumeTenantHandoff();
    expect(handed?.user.email).toBe("a@b.c");
    expect(loadSession()?.accessToken).toBe("a");
    expect(window.location.hash.includes(HANDOFF_HASH_KEY)).toBe(false);
  });

  it("ignores a broken handoff hash", () => {
    window.history.replaceState(null, "", `/#${HANDOFF_HASH_KEY}=not-valid`);
    expect(consumeTenantHandoff()).toBeNull();
    expect(loadSession()).toBeNull();
  });

  it("POSTs /auth/login then GET /auth/me, and does not GET me after 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid credentials", details: {} } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      completeTenantLogin({ tenantSlug: "acme", email: "a@b.c", password: "wrong" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example/api/v1/auth/login");
    expect(String(fetchMock.mock.calls[0][0]).includes("platform/login")).toBe(false);

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "tok",
            refreshToken: "ref",
            tokenType: "Bearer",
            user: { id: "u", email: "a@b.c", name: "A" },
            tenant: { id: "t", slug: "acme", name: "Acme" },
            permissions: ["hr.employees.read"],
            branchIds: [],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: { id: "u", email: "a@b.c", name: "A" },
            tenant: { id: "t", slug: "acme", name: "Acme" },
            permissions: ["hr.employees.read"],
            branchIds: [],
            enabledModules: ["HR", "ACCOUNTING"],
            industryPack: "TAWAF",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const next = await completeTenantLogin({ tenantSlug: "acme", email: "a@b.c", password: "ok" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example/api/v1/auth/login");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://api.example/api/v1/auth/me");
    expect(next.enabledModules).toEqual(["HR", "ACCOUNTING"]);
    expect(launchKind(launchTargets(next.enabledModules))).toBe("many");
  });

  it("does not GET /auth/me when login returns MFA_REQUIRED", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "MFA_REQUIRED", message: "Two-factor code required", details: { mfaToken: "chal" } },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(completeTenantLogin({ tenantSlug: "acme", email: "a@b.c", password: "ok" })).rejects.toMatchObject({
      name: "MfaRequiredError",
      mfaToken: "chal",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "tok",
            refreshToken: "ref",
            user: { id: "u", email: "a@b.c", name: "A" },
            tenant: { id: "t", slug: "acme", name: "Acme" },
            permissions: ["hr.employees.read"],
            branchIds: [],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ enabledModules: ["HR"] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await completeTenantLoginWithMfa({ mfaToken: "chal", code: "123456" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example/api/v1/auth/login/mfa");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://api.example/api/v1/auth/me");
  });
});
