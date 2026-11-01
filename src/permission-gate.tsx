import type { ReactNode } from "react";
import { hasAnyPermission, hasPermission } from "./session";
import { useProductSession } from "./session-context";

type PermissionGateProps = {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ permission, anyOf, children, fallback = null }: PermissionGateProps) {
  const session = useProductSession();
  const allowed = permission
    ? hasPermission(session, permission)
    : anyOf
      ? hasAnyPermission(session, anyOf)
      : true;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
