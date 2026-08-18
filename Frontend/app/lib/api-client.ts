import { getApiUrl, getStoredAuth } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredAuth()?.token;
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request gagal dengan status ${response.status}.`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function apiGet<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: RequestInit = {},
) {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options: RequestInit = {},
) {
  return apiFetch<T>(path, {
    ...options,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}
