import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import {
  clearSession,
  hasAnyPermission,
  hasPermission,
  isModuleEnabled,
  loadSession,
  saveSession,
  type AuthSession,
} from "./session";

function session(over: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "a",
    refreshToken: "r",
    tokenType: "Bearer",
    user: { id: "u", email: "a@b.c", name: "A" },
    tenant: { id: "t", slug: "acme", name: "Acme" },
    permissions: [],
    branchIds: [],
    enabledModules: ["HR"],
    ...over,
  };
}

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProductShellConfig();
    configureProductShell({
      storageKey: "hr.auth",
      localeStorageKey: "hr.locale",
      getBaseUrl: () => "/api/v1",
      tenantAdminPermission: "tenant.admin",
      expandPermissions: (perms) => {
        const next = new Set(perms);
        if (next.has("hr.read")) next.add("hr.employees.read");
        return [...next];
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    resetProductShellConfig();
  });

  it("round-trips storage", () => {
    const s = session({ permissions: ["hr.employees.read"] });
    saveSession(s);
    expect(loadSession()?.user.email).toBe("a@b.c");
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("grants tenant.admin every permission", () => {
    const s = session({ permissions: ["tenant.admin"] });
    expect(hasPermission(s, "hr.payroll.manage")).toBe(true);
  });

  it("denies a missing permission", () => {
    const s = session({ permissions: ["hr.employees.read"] });
    expect(hasPermission(s, "hr.payroll.manage")).toBe(false);
    expect(hasAnyPermission(s, ["hr.payroll.manage"])).toBe(false);
  });

  it("expands coarse keys", () => {
    const s = session({ permissions: ["hr.read"] });
    expect(hasPermission(s, "hr.employees.read")).toBe(true);
  });

  it("gates modules", () => {
    expect(isModuleEnabled(session({ enabledModules: ["HR"] }), "HR")).toBe(true);
    expect(isModuleEnabled(session({ enabledModules: ["ACCOUNTING"] }), "HR")).toBe(false);
    expect(isModuleEnabled(null, "HR")).toBe(false);
  });

  it("allows a platform session with no tenant", () => {
    const s = session({ tenant: undefined, permissions: ["platform.console.read"] });
    expect(hasPermission(s, "platform.console.read")).toBe(true);
    expect(hasPermission(s, "platform.tenants.manage")).toBe(false);
    saveSession(s);
    expect(loadSession()?.tenant).toBeUndefined();
  });
});
