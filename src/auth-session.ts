import type { AuthSession, AuthTenant, AuthUser } from "./config";
import { api, ApiRequestError } from "./custom-fetch";
import { clearSession, loadSession, saveSession } from "./session";

/** `GET /auth/me` fields the products read. */
export type MeResponse = {
  user?: AuthUser;
  tenant?: (AuthTenant & { industryPack?: string | null }) | null;
  permissions?: string[];
  branchIds?: string[];
  enabledModules?: string[];
  industryPack?: string | null;
};

/** The one merge of `/auth/me` into a stored session (tokens are kept). */
export function mergeMe(session: AuthSession, me: MeResponse): AuthSession {
  const industryPack = me.tenant?.industryPack ?? me.industryPack ?? undefined;
  const tenant = me.tenant ?? session.tenant;
  return {
    ...session,
    user: me.user ?? session.user,
    tenant: tenant ? ({ ...tenant, ...(industryPack ? { industryPack } : {}) } as AuthTenant) : tenant,
    permissions: me.permissions ?? session.permissions,
    branchIds: me.branchIds ?? session.branchIds ?? [],
    enabledModules: me.enabledModules ?? session.enabledModules ?? [],
  };
}

/**
 * Rotate the refresh token and SAVE the new pair before anything else runs.
 * It never calls an authenticated route, so it cannot wait on itself.
 * Returns the new access token, or null (session cleared) when the refresh token is dead.
 */
export async function refreshStoredTokens(): Promise<string | null> {
  const current = loadSession();
  if (!current?.refreshToken) return null;
  try {
    const tokens = await api.post<{ accessToken: string; refreshToken?: string }>("/auth/refresh", {
      refreshToken: current.refreshToken,
    });
    // Another tab may have logged out meanwhile; only write over the session we refreshed.
    const latest = loadSession();
    if (!latest || latest.refreshToken !== current.refreshToken) return latest?.accessToken ?? null;
    saveSession({ ...latest, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? latest.refreshToken });
    return tokens.accessToken;
  } catch (err) {
    // Network failure: keep the session so a reload can retry. Rejected token: it is dead.
    if (err instanceof ApiRequestError) clearSession();
    return null;
  }
}

/**
 * Refresh permissions/modules from `/auth/me`. The fetch wrapper refreshes the access token
 * on a 401 first. Returns null when the user is no longer signed in — never the stale session.
 * A network failure keeps the stored session.
 */
export async function hydrateStoredSession(): Promise<AuthSession | null> {
  if (!loadSession()) return null;
  try {
    const me = await api.get<MeResponse>("/auth/me");
    const latest = loadSession();
    if (!latest) return null;
    const next = mergeMe(latest, me);
    saveSession(next);
    return next;
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
      clearSession();
      return null;
    }
    return loadSession();
  }
}

/** Best effort: revoke the refresh token server-side, then forget the session. */
export function signOutStoredSession() {
  const current = loadSession();
  clearSession();
  if (current?.refreshToken) {
    void api.post("/auth/revoke", { refreshToken: current.refreshToken }).catch(() => undefined);
  }
}
