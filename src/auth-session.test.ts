import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppGate, ProductAuthProvider } from "./auth-provider";
import { hydrateStoredSession, mergeMe, refreshStoredTokens } from "./auth-session";
import { configureProductShell, resetProductShellConfig, type AuthSession } from "./config";
import { api, configureApiClient, resetApiClient } from "./custom-fetch";
import { loadSession, saveSession } from "./session";

const base: AuthSession = {
  accessToken: "expired",
  refreshToken: "r1",
  tokenType: "Bearer",
  user: { id: "u", email: "e@x", name: "U" },
  tenant: { id: "t", slug: "baz", name: "Baz" },
  permissions: ["tenant.admin"],
  branchIds: [],
  enabledModules: ["ACCOUNTING"],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function wire() {
  configureApiClient({
    getAccessToken: () => loadSession()?.accessToken ?? null,
    refreshAccessToken: refreshStoredTokens,
    onUnauthorized: () => undefined,
  });
}

/** Routes by path and bearer, like the real API: only the current access token works. */
function fakeApi(options: { refreshOk: boolean }) {
  let valid = "fresh-0";
  let refreshCalls = 0;
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const auth = new Headers(init.headers).get("Authorization");
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      if (!options.refreshOk) return json({ error: { code: "UNAUTHORIZED", message: "Invalid refresh token", details: {} } }, 401);
      valid = `fresh-${refreshCalls}`;
      return json({ accessToken: valid, refreshToken: `r${refreshCalls + 1}` });
    }
    if (auth !== `Bearer ${valid}`) return json({ error: { code: "UNAUTHORIZED", message: "no", details: {} } }, 401);
    if (url.endsWith("/auth/me")) return json({ permissions: ["tenant.admin"], enabledModules: ["ACCOUNTING", "HR"], industryPack: "GENERAL" });
    return json({ ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, refreshCalls: () => refreshCalls };
}

describe("tenant session lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProductShellConfig();
    configureProductShell({ storageKey: "test.auth", getBaseUrl: () => "https://api.test/api/v1" });
    resetApiClient();
    wire();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetApiClient();
  });

  it("boots with an expired access token: rotates, saves, hydrates (no hang)", async () => {
    saveSession(base);
    const { refreshCalls } = fakeApi({ refreshOk: true });
    const next = await hydrateStoredSession();
    expect(next?.accessToken).toBe("fresh-1");
    expect(next?.enabledModules).toEqual(["ACCOUNTING", "HR"]);
    expect(loadSession()?.refreshToken).toBe("r2");
    expect(refreshCalls()).toBe(1);
  });

  it("dead refresh token ends signed out (null), never the stale session", async () => {
    saveSession(base);
    fakeApi({ refreshOk: false });
    expect(await hydrateStoredSession()).toBeNull();
    expect(loadSession()).toBeNull();
  });

  it("parallel 401s share one rotation", async () => {
    saveSession(base);
    const { refreshCalls } = fakeApi({ refreshOk: true });
    await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);
    expect(refreshCalls()).toBe(1);
  });

  it("network failure during refresh keeps the session for a retry", async () => {
    saveSession(base);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) throw new TypeError("offline");
      return json({ error: { code: "UNAUTHORIZED", message: "no", details: {} } }, 401);
    }));
    expect(await refreshStoredTokens()).toBeNull();
    expect(loadSession()?.refreshToken).toBe("r1");
  });

  it("mergeMe keeps tokens and carries industryPack onto the tenant", () => {
    const merged = mergeMe(base, { enabledModules: ["HR"], industryPack: "TRANSPORT" });
    expect(merged.accessToken).toBe("expired");
    expect((merged.tenant as { industryPack?: string }).industryPack).toBe("TRANSPORT");
  });

  it("AppGate sends a signed-out user to login, not the 'not enabled' screen", () => {
    const html = renderToStaticMarkup(
      createElement(ProductAuthProvider, null,
        createElement(AppGate, { module: "ACCOUNTING", mark: "د", onSignedOut: () => "LOGIN", children: "APP" })),
    );
    expect(html).toBe("LOGIN");
  });
});
