import type { ApiError as ApiErrorBody, AuthTokens } from "@chatbox/shared";

import { tokenStore } from "./tokenStore";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

type TSessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<TSessionExpiredListener>();

export const onSessionExpired = (listener: TSessionExpiredListener) => {
    sessionExpiredListeners.add(listener);
    return () => {
        sessionExpiredListeners.delete(listener);
    };
};

const ensureConfigured = () => {
    if (!API_URL) throw new ApiError(0, "NOT_CONFIGURED", "Set EXPO_PUBLIC_API_URL to connect to the Chatbox server.");
};

const parseError = async (response: Response): Promise<ApiError> => {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    return new ApiError(response.status, body?.error.code ?? "HTTP_ERROR", body?.error.message ?? "Something went wrong");
};

let refreshing: Promise<string | null> | null = null;

// Single-flight rotation: concurrent 401s share one refresh so a rotated token is never replayed.
export const refreshAccessToken = (): Promise<string | null> => {
    const refreshToken = tokenStore.get()?.refreshToken;
    if (!refreshToken) return Promise.resolve(null);
    refreshing ??= fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    })
        .then(async (response) => {
            if (response.status === 401) {
                await tokenStore.clear();
                sessionExpiredListeners.forEach((listener) => listener());
                return null;
            }
            if (!response.ok) return null;
            const tokens = (await response.json()) as AuthTokens;
            await tokenStore.save(tokens);
            return tokens.accessToken;
        })
        .catch(() => null)
        .finally(() => {
            refreshing = null;
        });
    return refreshing;
};

const isExpiringSoon = () => {
    const expiresAt = tokenStore.get()?.accessTokenExpiresAt;
    return Boolean(expiresAt && Date.parse(expiresAt) - Date.now() < 30_000);
};

export const validAccessToken = async (): Promise<string | null> => {
    if (isExpiringSoon()) await refreshAccessToken();
    return tokenStore.accessToken();
};

type TBody = Record<string, unknown> | unknown[] | FormData | undefined;

const PUBLIC_PATHS = new Set([
    "/auth/register",
    "/auth/login",
    "/auth/social",
    "/auth/refresh",
    "/auth/password/forgot",
    "/auth/password/reset",
]);

export const request = async <T>(method: string, path: string, body?: TBody, retry = true): Promise<T> => {
    ensureConfigured();
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = { accept: "application/json" };
    const token = PUBLIC_PATHS.has(path) ? null : await validAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined && !isForm) headers["content-type"] = "application/json";

    let response: Response;
    try {
        response = await fetch(`${API_URL}/v1${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
    }

    if (response.status === 401 && retry && token) {
        const next = await refreshAccessToken();
        if (next) return request<T>(method, path, body, false);
    }
    if (!response.ok) throw await parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
};

export interface IUploadFile {
    uri: string;
    name: string;
    type: string;
}

// XHR is used for uploads because fetch doesn't expose upload progress in React Native.
export const upload = <T>(method: "POST" | "PUT", path: string, file: IUploadFile, onProgress?: (percent: number) => void): Promise<T> =>
    new Promise((resolve, reject) => {
        void (async () => {
            ensureConfigured();
            const token = await validAccessToken();
            const form = new FormData();
            form.append("file", file as unknown as Blob);
            const xhr = new XMLHttpRequest();
            xhr.open(method, `${API_URL}/v1${path}`);
            if (token) xhr.setRequestHeader("authorization", `Bearer ${token}`);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
            };
            xhr.onerror = () => reject(new ApiError(0, "NETWORK_ERROR", "Upload failed. Check your connection."));
            xhr.onload = () => {
                const body = (() => {
                    try {
                        return JSON.parse(xhr.responseText) as unknown;
                    } catch {
                        return null;
                    }
                })();
                if (xhr.status >= 200 && xhr.status < 300) return resolve(body as T);
                const error = (body as ApiErrorBody | null)?.error;
                reject(new ApiError(xhr.status, error?.code ?? "UPLOAD_FAILED", error?.message ?? "Upload failed"));
            };
            xhr.send(form);
        })().catch(reject);
    });

export const api = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: TBody) => request<T>("POST", path, body ?? {}),
    put: <T>(path: string, body?: TBody) => request<T>("PUT", path, body ?? {}),
    patch: <T>(path: string, body?: TBody) => request<T>("PATCH", path, body ?? {}),
    delete: <T>(path: string) => request<T>("DELETE", path),
};

export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
