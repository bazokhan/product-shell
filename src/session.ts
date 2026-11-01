import { productShellConfig, type AuthSession } from "./config";

export type { AuthSession, AuthTenant, AuthUser } from "./config";

function storageKey() {
  return productShellConfig().storageKey;
}

function heldPermissions(session: AuthSession): string[] {
  const expand = productShellConfig().expandPermissions;
  return expand ? expand(session.permissions) : [...session.permissions];
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(storageKey(), JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(storageKey());
}

export function hasPermission(session: AuthSession | null, permission: string): boolean {
  if (!session) return false;
  const held = heldPermissions(session);
  const admin = productShellConfig().tenantAdminPermission ?? "tenant.admin";
  if (held.includes(admin)) return true;
  return held.includes(permission);
}

export function hasAnyPermission(session: AuthSession | null, permissions: string[]): boolean {
  if (!session) return false;
  const held = heldPermissions(session);
  const admin = productShellConfig().tenantAdminPermission ?? "tenant.admin";
  if (held.includes(admin)) return true;
  return permissions.some((p) => held.includes(p));
}

export function canSeeNav(session: AuthSession | null): boolean {
  return Boolean(session);
}

export function isModuleEnabled(session: AuthSession | null, module: string): boolean {
  return Boolean(session?.enabledModules?.includes(module));
}
