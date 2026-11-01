import { createContext, useContext, type ReactNode } from "react";
import type { AuthSession } from "./config";

const SessionContext = createContext<AuthSession | null>(null);

export function ProductSessionProvider({
  session,
  children,
}: {
  session: AuthSession | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useProductSession(): AuthSession | null {
  return useContext(SessionContext);
}
