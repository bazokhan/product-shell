import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import { filterNavByAnyOf, matchNavAnyOf } from "./nav-filter";
import type { AuthSession } from "./session";

function session(over: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "a",
    refreshToken: "r",
    tokenType: "Bearer",
    user: { id: "u", email: "a@b.c", name: "A" },
    tenant: { id: "t", slug: "acme", name: "Acme" },
    permissions: [],
    branchIds: [],
    enabledModules: ["ACCOUNTING"],
    ...over,
  };
}

const nav = [
  { type: "link" as const, to: "/", anyOf: ["accounting.read"] },
  {
    type: "section" as const,
    children: [
      { to: "/accounting/journals", anyOf: ["accounting.read", "accounting.journals.manage"] },
      { to: "/banking/cashboxes", anyOf: ["accounting.cash.manage"] },
    ],
  },
  { type: "link" as const, to: "/admin/roles", anyOf: ["iam.roles.manage"] },
];

describe("filterNavByAnyOf", () => {
  beforeEach(() => {
    resetProductShellConfig();
    configureProductShell({
      storageKey: "accounting.auth",
      localeStorageKey: "accounting.locale",
      getBaseUrl: () => "/api/v1",
      tenantAdminPermission: "tenant.admin",
    });
  });

  afterEach(() => {
    resetProductShellConfig();
  });

  it("keeps cashier cash and drops journals and roles", () => {
    const visible = filterNavByAnyOf(nav, session({ permissions: ["accounting.cash.manage"] }));
    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({ type: "section" });
    if (visible[0].type === "section") {
      expect(visible[0].children.map((c) => c.to)).toEqual(["/banking/cashboxes"]);
    }
  });

  it("hides a link when the session lacks every anyOf key", () => {
    const visible = filterNavByAnyOf(nav, session({ permissions: ["accounting.reports.read"] }));
    expect(visible).toEqual([]);
  });

  it("tenant.admin sees every entry", () => {
    const visible = filterNavByAnyOf(nav, session({ permissions: ["tenant.admin"] }));
    expect(visible).toHaveLength(3);
  });
});

describe("matchNavAnyOf", () => {
  const links = [
    { to: "/", exact: true, anyOf: ["accounting.read"] },
    { to: "/accounting/journals", anyOf: ["accounting.journals.manage"] },
    { to: "/payroll", href: "https://hr.trugraph.io/payroll", anyOf: ["accounting.read"] },
  ];

  it("matches the longest internal path", () => {
    expect(matchNavAnyOf("/accounting/journals/new", links)).toEqual(["accounting.journals.manage"]);
  });

  it("does not treat an external payroll href as a route guard", () => {
    expect(matchNavAnyOf("/payroll", links)).toBeUndefined();
  });
});
