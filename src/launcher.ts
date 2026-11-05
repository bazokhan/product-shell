import { productShellConfig, type AuthSession, type AuthTenant, type AuthUser } from "./config";
import { api } from "./custom-fetch";
import { saveSession } from "./session";

export const HANDOFF_HASH_KEY = "tg_handoff";

export const SELLABLE_PRODUCTS = [
  {
    module: "HR",
    mark: "ح",
    nameAr: "كَادر",
    nameEn: "Kader",
    defaultOrigin: "https://hr.trugraph.io",
  },
  {
    module: "ACCOUNTING",
    mark: "د",
    nameAr: "دَفتر",
    nameEn: "Daftar",
    defaultOrigin: "https://accounting.trugraph.io",
  },
  {
    module: "OPERATIONS",
    mark: "ر",
    nameAr: "رِحال",
    nameEn: "Rihal",
    defaultOrigin: "https://rihal.trugraph.io",
  },
] as const;

export type SellableModule = (typeof SELLABLE_PRODUCTS)[number]["module"];

export type LaunchTarget = {
  module: SellableModule;
  mark: string;
  nameAr: string;
  nameEn: string;
  origin: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  user: AuthUser;
  tenant?: AuthTenant | null;
  permissions: string[];
  branchIds?: string[];
};

type MeResponse = {
  user?: AuthUser;
  tenant?: AuthTenant | null;
  permissions?: string[];
  branchIds?: string[];
  enabledModules?: string[];
  industryPack?: string;
};

function originFor(module: SellableModule): string {
  const override = productShellConfig().productOrigins?.[module];
  const raw = override ?? SELLABLE_PRODUCTS.find((row) => row.module === module)!.defaultOrigin;
  return raw.replace(/\/$/, "");
}

export function launchTargets(enabledModules: readonly string[] | undefined | null): LaunchTarget[] {
  const enabled = new Set(enabledModules ?? []);
  return SELLABLE_PRODUCTS.filter((row) => enabled.has(row.module)).map((row) => ({
    module: row.module,
    mark: row.mark,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    origin: originFor(row.module),
  }));
}

export function launchKind(targets: readonly LaunchTarget[]): "none" | "one" | "many" {
  if (targets.length === 0) return "none";
  if (targets.length === 1) return "one";
  return "many";
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const padded = raw.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function withHandoff(origin: string, session: AuthSession): string {
  return `${origin.replace(/\/$/, "")}/#${HANDOFF_HASH_KEY}=${toBase64Url(JSON.stringify(session))}`;
}

export function consumeTenantHandoff(
  location: Pick<Location, "hash" | "pathname" | "search"> | null = typeof window === "undefined" ? null : window.location,
  history: Pick<History, "replaceState"> | null = typeof window === "undefined" ? null : window.history,
): AuthSession | null {
  if (!location || !history) return null;
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const raw = params.get(HANDOFF_HASH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as AuthSession;
    if (!parsed?.accessToken || !parsed.refreshToken) return null;
    saveSession(parsed);
    params.delete(HANDOFF_HASH_KEY);
    const rest = params.toString();
    history.replaceState(null, "", `${location.pathname}${location.search}${rest ? `#${rest}` : ""}`);
    return parsed;
  } catch {
    return null;
  }
}

function toSession(login: LoginResponse, me?: MeResponse): AuthSession {
  return {
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    tokenType: login.tokenType ?? "Bearer",
    user: me?.user ?? login.user,
    tenant: me?.tenant ?? login.tenant,
    permissions: me?.permissions ?? login.permissions,
    branchIds: me?.branchIds ?? login.branchIds ?? [],
    enabledModules: me?.enabledModules ?? [],
  };
}

export async function completeTenantLogin(input: {
  tenantSlug: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const login = await api.post<LoginResponse>("/auth/login", input);
  saveSession(toSession(login));
  const me = await api.get<MeResponse>("/auth/me");
  const session = toSession(login, me);
  saveSession(session);
  return session;
}
