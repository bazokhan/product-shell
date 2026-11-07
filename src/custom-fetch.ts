import { productShellConfig } from "./config";

export type StructuredError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
  requestId?: string;
};

export type ErrorResponse = {
  error: StructuredError;
};

export class ApiRequestError extends Error {
  status: number;
  body?: ErrorResponse;

  constructor(message: string, status: number, body?: ErrorResponse) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<string | null>;
type LogoutHandler = () => void;

let getAccessToken: TokenProvider = () => null;
let refreshAccessToken: RefreshHandler = async () => null;
let onUnauthorized: LogoutHandler = () => undefined;
let refreshInFlight: Promise<string | null> | null = null;
let refreshBlockedUntil = 0;

const SKIP_REFRESH_RETRY = /\/auth\/(refresh|login|login\/mfa|platform\/login|client-credentials)(?:\?|$)/;

export function configureApiClient(options: {
  getAccessToken: TokenProvider;
  refreshAccessToken: RefreshHandler;
  onUnauthorized: LogoutHandler;
}) {
  getAccessToken = options.getAccessToken;
  refreshAccessToken = options.refreshAccessToken;
  onUnauthorized = options.onUnauthorized;
}

export function resetApiClient() {
  getAccessToken = () => null;
  refreshAccessToken = async () => null;
  onUnauthorized = () => undefined;
  refreshInFlight = null;
  refreshBlockedUntil = 0;
}

function buildFullUrl(path: string) {
  const base = productShellConfig().getBaseUrl().replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseError(response: Response): Promise<ApiRequestError> {
  let body: ErrorResponse | undefined;
  try {
    body = (await response.json()) as ErrorResponse;
  } catch {
    body = undefined;
  }
  const message = body?.error?.message ?? response.statusText;
  return new ApiRequestError(message, response.status, body);
}

async function readBody(response: Response) {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  return JSON.parse(text) as unknown;
}

async function authenticatedFetch(url: string, init: RequestInit, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildFullUrl(url), { ...init, headers });

  if (response.status === 401 && retry && !SKIP_REFRESH_RETRY.test(url)) {
    if (Date.now() < refreshBlockedUntil) {
      onUnauthorized();
      throw new ApiRequestError("Unauthorized", 401);
    }
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const newToken = await refreshInFlight;
    if (newToken) {
      return authenticatedFetch(url, init, false);
    }
    refreshBlockedUntil = Date.now() + 30_000;
    onUnauthorized();
    throw new ApiRequestError("Unauthorized", 401);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
}

/** Orval v8 mutator — returns `{ data, status, headers }` envelope. */
export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await authenticatedFetch(url, options);
  const data = await readBody(response);
  return { data, status: response.status, headers: response.headers } as T;
};

export function unwrapData<T>(response: { data: unknown }): T {
  return response.data as T;
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const response = await authenticatedFetch(path, { method: "POST", body: form });
  return (await readBody(response)) as T;
}

function appendQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

export const api = {
  get: async <T>(path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
    const response = await authenticatedFetch(appendQuery(path, query), { method: "GET" });
    return readBody(response) as Promise<T>;
  },
  post: async <T>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined | null>,
  ) => {
    const response = await authenticatedFetch(appendQuery(path, query), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return readBody(response) as Promise<T>;
  },
  patch: async <T>(path: string, body?: unknown) => {
    const response = await authenticatedFetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return readBody(response) as Promise<T>;
  },
  delete: async <T>(path: string) => {
    const response = await authenticatedFetch(path, { method: "DELETE" });
    return readBody(response) as Promise<T>;
  },
};

export type CustomFetchOptions = never;
