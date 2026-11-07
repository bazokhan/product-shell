import { api, ApiRequestError } from "./custom-fetch";

export class MfaRequiredError extends Error {
  mfaToken: string;

  constructor(mfaToken: string) {
    super("MFA_REQUIRED");
    this.name = "MfaRequiredError";
    this.mfaToken = mfaToken;
  }
}

export function mfaTokenFromError(err: unknown): string | null {
  if (err instanceof MfaRequiredError) return err.mfaToken;
  if (err instanceof ApiRequestError && err.body?.error?.code === "MFA_REQUIRED") {
    const token = err.body.error.details?.mfaToken;
    return typeof token === "string" && token.length > 0 ? token : null;
  }
  return null;
}

export function throwIfMfaRequired(err: unknown): never {
  const token = mfaTokenFromError(err);
  if (token) throw new MfaRequiredError(token);
  throw err;
}

export async function completeTenantMfaLogin(input: { mfaToken: string; code: string }) {
  return api.post("/auth/login/mfa", input);
}

export async function completePlatformMfaLogin(input: { mfaToken: string; code: string }) {
  return api.post("/auth/login/mfa", input);
}

export function fetchMfaStatus() {
  return api.get<{ enabled: boolean }>("/auth/mfa");
}

export function setupMfa() {
  return api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>("/auth/mfa/setup");
}

export function enableMfa(code: string) {
  return api.post<{ enabled: boolean }>("/auth/mfa/enable", { code });
}

export function disableMfa(password: string, code: string) {
  return api.post<{ enabled: boolean }>("/auth/mfa/disable", { password, code });
}
