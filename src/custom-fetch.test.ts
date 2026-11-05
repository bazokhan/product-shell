import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import {
  ApiRequestError,
  api,
  configureApiClient,
  customFetch,
  resetApiClient,
} from "./custom-fetch";

describe("customFetch", () => {
  beforeEach(() => {
    resetProductShellConfig();
    configureProductShell({ storageKey: "t", getBaseUrl: () => "https://api.example/api/v1" });
    resetApiClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetApiClient();
    resetProductShellConfig();
  });

  it("attaches bearer and returns envelope", async () => {
    configureApiClient({
      getAccessToken: () => "tok",
      refreshAccessToken: async () => null,
      onUnauthorized: () => undefined,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await customFetch<{ data: { ok: boolean }; status: number }>("/hr/employees");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example/api/v1/hr/employees");
    expect(result.data.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("refreshes once on 401 then retries", async () => {
    let token = "old";
    configureApiClient({
      getAccessToken: () => token,
      refreshAccessToken: async () => {
        token = "new";
        return token;
      },
      onUnauthorized: () => undefined,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await customFetch("/hr/employees");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((fetchMock.mock.calls[1][1] as RequestInit).headers as Headers).get("Authorization")).toBe("Bearer new");
  });

  it("does not refresh login 401", async () => {
    const logout = vi.fn();
    configureApiClient({
      getAccessToken: () => null,
      refreshAccessToken: async () => "x",
      onUnauthorized: logout,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "bad", details: {} } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(customFetch("/auth/login")).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });

  it("posts a relative same-origin login without throwing Invalid URL", async () => {
    resetProductShellConfig();
    configureProductShell({ storageKey: "minbar.auth", getBaseUrl: () => "/api/v1" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "t", refreshToken: "r", permissions: [] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const payload = await api.post<{ accessToken: string }>("/auth/platform/login", {
      email: "op@example.com",
      password: "x",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/platform/login");
    expect(payload.accessToken).toBe("t");
  });

  it("does not double-prefix query GETs on an absolute API base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await api.get("/platform/tenants", { page: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example/api/v1/platform/tenants?page=1");
  });

  it("logs out when refresh fails", async () => {
    const logout = vi.fn();
    configureApiClient({
      getAccessToken: () => "old",
      refreshAccessToken: async () => null,
      onUnauthorized: logout,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    await expect(customFetch("/hr/employees")).rejects.toMatchObject({ status: 401 });
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
