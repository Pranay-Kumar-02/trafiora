/**
 * Centralized, Environment-Configured API Client for Trafiora Control Plane.
 * 
 * Rules:
 * - Leverages same-origin Next.js proxy (/api/v1/...) in browser to prevent CORS issues
 * - Supports NEXT_PUBLIC_API_URL override for external API deployments
 * - Strict typing and uniform error formatting
 * - Zero client-side credential/secret exposure
 */

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail || message;
  }
}

function getApiBaseUrl(): string {
  // If explicitly configured with an absolute external API URL
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return `${envUrl.replace(/\/+$/, "")}/api/v1`;
  }
  // Default to same-origin proxy route handled by Next.js rewrites
  return "/api/v1";
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errJson.error || errorDetail;
    } catch {
      const text = await response.text().catch(() => "");
      if (text) errorDetail = text;
    }
    throw new ApiError(response.status, errorDetail, errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  getBaseUrl: getApiBaseUrl,
};
