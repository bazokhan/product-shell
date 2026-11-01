import type { ReactNode } from "react";
import { isModuleEnabled } from "./session";
import { useProductSession } from "./session-context";

type ModuleGateProps = {
  module: string;
  children: ReactNode;
  fallback: ReactNode;
  session?: ReturnType<typeof useProductSession>;
};

export function ModuleGate({ module, children, fallback, session }: ModuleGateProps) {
  const ctx = useProductSession();
  const current = session === undefined ? ctx : session;
  if (!isModuleEnabled(current, module)) return <>{fallback}</>;
  return <>{children}</>;
}
