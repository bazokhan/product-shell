import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, configureApiClient, resetApiClient } from "./custom-fetch";
import { configureProductShell, resetProductShellConfig } from "./config";
import { MfaRequiredError, mfaTokenFromError, setupMfa, throwIfMfaRequired } from "./mfa";

describe("mfa helpers", () => {
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

  it("reads mfaToken from MFA_REQUIRED without treating it as a session", () => {
    const err = new ApiRequestError("Two-factor code required", 401, {
      error: { code: "MFA_REQUIRED", message: "Two-factor code required", details: { mfaToken: "chal" } },
    });
    expect(mfaTokenFromError(err)).toBe("chal");
    expect(() => throwIfMfaRequired(err)).toThrow(MfaRequiredError);
  });

  it("POSTs /auth/mfa/setup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ secret: "ABC", otpauthUrl: "otpauth://totp/x", qrDataUrl: "data:image/png;base64,x" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const setup = await setupMfa();
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example/api/v1/auth/mfa/setup");
    expect(setup.secret).toBe("ABC");
  });
});
