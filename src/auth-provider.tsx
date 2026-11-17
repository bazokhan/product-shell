import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AuthSession } from "./config";
import { configureApiClient } from "./custom-fetch";
import { hydrateStoredSession, refreshStoredTokens, signOutStoredSession } from "./auth-session";
import { completeTenantLogin, completeTenantLoginWithMfa } from "./launcher";
import { NoEntitlementScreen } from "./screens";
import { isModuleEnabled, loadSession } from "./session";
import { ProductSessionProvider } from "./session-context";
import { SettingsProvider } from "./settings";

type ProductAuthValue = {
  session: AuthSession | null;
  isLoading: boolean;
  login: (tenantSlug: string, email: string, password: string) => Promise<void>;
  completeMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
};

const ProductAuthContext = createContext<ProductAuthValue | null>(null);

/**
 * The one tenant-app auth provider (كَادر / دَفتر / رِحال).
 * Boot: hydrate from `/auth/me`; the fetch wrapper rotates an expired access token first.
 * Any dead session ends as `session === null` so `AppGate` sends the user to login.
 */
export function ProductAuthProvider({
  children,
  onSessionChange,
}: {
  children: ReactNode;
  /** Called after every session write (for app stores that mirror the session). */
  onSessionChange?: () => void;
}) {
  const [session, setSessionState] = useState<AuthSession | null>(() => loadSession());
  const [isLoading, setIsLoading] = useState(() => loadSession() !== null);

  const setSession = useCallback(
    (next: AuthSession | null) => {
      setSessionState(next);
      onSessionChange?.();
    },
    [onSessionChange],
  );

  const logout = useCallback(() => {
    signOutStoredSession();
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => loadSession()?.accessToken ?? null,
      refreshAccessToken: refreshStoredTokens,
      // The wrapper clears nothing itself; a failed refresh already cleared storage.
      onUnauthorized: () => setSession(loadSession()),
    });
    if (!loadSession()) return;
    let cancelled = false;
    void hydrateStoredSession().then((next) => {
      if (cancelled) return;
      setSession(next);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const login = useCallback(
    async (tenantSlug: string, email: string, password: string) => {
      await completeTenantLogin({ tenantSlug, email, password });
      setSession(loadSession());
    },
    [setSession],
  );

  const completeMfa = useCallback(
    async (mfaToken: string, code: string) => {
      await completeTenantLoginWithMfa({ mfaToken, code });
      setSession(loadSession());
    },
    [setSession],
  );

  const value = useMemo(
    () => ({ session, isLoading, login, completeMfa, logout }),
    [session, isLoading, login, completeMfa, logout],
  );

  return (
    <ProductAuthContext.Provider value={value}>
      <ProductSessionProvider session={session}>{children}</ProductSessionProvider>
    </ProductAuthContext.Provider>
  );
}

export function useProductAuth(): ProductAuthValue {
  const ctx = useContext(ProductAuthContext);
  if (!ctx) throw new Error("useProductAuth must be used within ProductAuthProvider");
  return ctx;
}

export function FullScreenSpinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh grid place-items-center bg-background text-muted-foreground" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden />
        <span className="text-sm">{label ?? t("app.loading")}</span>
      </div>
    </div>
  );
}

/**
 * Gate for a product's authenticated layout. Signed out → `onSignedOut` (redirect to login);
 * never the "not enabled" screen, which is only for a signed-in tenant without the module.
 */
export function AppGate({
  module,
  mark,
  onSignedOut,
  children,
}: {
  module: string;
  mark: string;
  onSignedOut: () => ReactNode;
  children: ReactNode;
}) {
  const { session, isLoading, logout } = useProductAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (!session) return <>{onSignedOut()}</>;
  if (!isModuleEnabled(session, module)) return <NoEntitlementScreen mark={mark} onLogout={logout} />;
  return <SettingsProvider>{children}</SettingsProvider>;
}
