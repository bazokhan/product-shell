export type AuthUser = { id: string; email: string; name: string };
export type AuthTenant = { id: string; slug: string; name: string };

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: AuthUser;
  /** Absent for مِنبر platform operators (no tenant). */
  tenant?: AuthTenant | null;
  permissions: string[];
  branchIds: string[];
  enabledModules?: string[];
};

export type ProductShellConfig = {
  storageKey: string;
  localeStorageKey: string;
  getBaseUrl: () => string;
  expandPermissions?: (permissions: readonly string[]) => string[];
  tenantAdminPermission?: string;
};

const DEFAULTS: ProductShellConfig = {
  storageKey: "product.auth",
  localeStorageKey: "product.locale",
  getBaseUrl: () => "/api/v1",
  tenantAdminPermission: "tenant.admin",
};

let config: ProductShellConfig = { ...DEFAULTS };

export function configureProductShell(partial: Partial<ProductShellConfig> & Pick<ProductShellConfig, "storageKey">) {
  config = { ...DEFAULTS, ...config, ...partial };
}

export function productShellConfig(): ProductShellConfig {
  return config;
}

export function resetProductShellConfig() {
  config = { ...DEFAULTS };
}
