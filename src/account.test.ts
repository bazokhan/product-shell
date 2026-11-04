import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import { configureApiClient, resetApiClient } from "./custom-fetch";
import { newPasswordIssue, submitChangePassword } from "./account";

describe("account password", () => {
  beforeEach(() => {
    resetProductShellConfig();
    configureProductShell({ storageKey: "t", getBaseUrl: () => "https://api.example/api/v1" });
    resetApiClient();
    configureApiClient({
      getAccessToken: () => "tok",
      refreshAccessToken: async () => null,
      onUnauthorized: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetApiClient();
    resetProductShellConfig();
  });

  it("rejects a short new password without calling the API", async () => {
    expect(newPasswordIssue("short", "short")).toBe("short");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitChangePassword("CurrentPassword123!", "short", "short");
    expect(result).toEqual({ ok: false, issue: "short" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatch without calling the API", async () => {
    expect(newPasswordIssue("NewStrongPassword123!", "OtherPassword123!")).toBe("mismatch");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitChangePassword("CurrentPassword123!", "NewStrongPassword123!", "OtherPassword123!");
    expect(result).toEqual({ ok: false, issue: "mismatch" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs /auth/change-password when the new password is valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ changed: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitChangePassword("CurrentPassword123!", "NewStrongPassword123!", "NewStrongPassword123!");
    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example/api/v1/auth/change-password");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      currentPassword: "CurrentPassword123!",
      newPassword: "NewStrongPassword123!",
    });
  });
});
