import type { ApiError, AuthResponse, AuthTokens } from "@chatbox/shared";

// Runtime config (written by the container entrypoint) wins over the build-time default.
export const API_URL = (window.__CHATBOX_CONFIG__?.apiUrl || import.meta.env.VITE_API_URL || "").replace(
  /\/$/,
  "",
);

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<(token: string | null) => void>();

export const getAccessToken = () => accessToken;

export const onAccessToken = (listener: (token: string | null) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setAccessToken = (token: string | null) => {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
};

export const applyAuth = (auth: AuthResponse | AuthTokens) => {
  setAccessToken("tokens" in auth ? auth.tokens.accessToken : auth.accessToken);
};

export const clearAuth = () => setAccessToken(null);

const baseHeaders = { "x-auth-mode": "cookie" };

const parseError = async (response: Response): Promise<ApiRequestError> => {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  return new ApiRequestError(
    response.status,
    body?.error.code ?? "HTTP_ERROR",
    body?.error.message ?? response.statusText,
  );
};

// Single-flight refresh: concurrent 401s share one rotation so the server never sees a replayed token.
export const refreshSession = (): Promise<string | null> => {
  refreshing ??= fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { ...baseHeaders, "content-type": "application/json" },
    body: "{}",
  })
    .then(async (response) => {
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const tokens = (await response.json()) as AuthTokens;
      setAccessToken(tokens.accessToken);
      return tokens.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export const request = async <T>(method: string, path: string, body?: Body, retry = true): Promise<T> => {
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { ...baseHeaders };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !isForm) headers["content-type"] = "application/json";

  const response = await fetch(`${API_URL}/v1${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const token = await refreshSession();
    if (token) return request<T>(method, path, body, false);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: Body) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: Body) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: Body) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export const errorMessage = (error: unknown): string =>
  error instanceof ApiRequestError || error instanceof Error ? error.message : "Something went wrong";
