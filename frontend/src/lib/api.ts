import toast from "react-hot-toast";
import { ApiError, toApiError } from "./api-error";
import type { User } from "@/types";
export type { User, Problem, Submission, Contest, Role, Page } from "@/types";
export { ApiError } from "./api-error";
let accessToken: string | null = null;
export function setToken(t: string | null) {
  accessToken = t;
}
export type ApiOptions = {
  silent?: boolean;
  successMessage?: string;
  errorMessage?: string;
};
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return false;
      const session = (await res.json()) as { accessToken: string; user: User };
      if (!session.accessToken) return false;
      setToken(session.accessToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}
async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: ApiOptions = {},
  retry = true,
): Promise<T> {
  const headers = new Headers();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  // Let the browser set multipart/form-data with its generated boundary.
  if (body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const url = path.startsWith("/api/")
    ? path
    : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
    });
    if (
      res.status === 401 &&
      retry &&
      !path.startsWith("/auth/") &&
      (await tryRefresh())
    )
      return request<T>(method, path, body, options, false);
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
        error?: string;
      };
      throw new ApiError(
        res.status,
        errBody.code || "API_ERROR",
        errBody.message ||
          errBody.error ||
          `Yêu cầu thất bại (HTTP ${res.status})`,
      );
    }
    let result: T;
    if (res.status === 204) result = undefined as T;
    else {
      const text = await res.text();
      result = text ? (JSON.parse(text) as T) : (undefined as T);
    }
    if (!options.silent && (method !== "GET" || options.successMessage))
      toast.success(options.successMessage || "Thao tác thành công", {
        id: `success:${method}:${path}`,
      });
    return result;
  } catch (error) {
    const err = toApiError(error);
    if (err.code === "NETWORK_ERROR")
      err.message =
        "Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối hoặc backend.";
    if (!options.silent)
      toast.error(options.errorMessage || err.message, {
        id: `error:${method}:${path}`,
      });
    throw err;
  }
}
export const api = {
  get: <T>(p: string, o?: ApiOptions) => request<T>("GET", p, undefined, o),
  post: <T>(p: string, b: unknown = {}, o?: ApiOptions) =>
    request<T>("POST", p, b, o),
  put: <T>(p: string, b: unknown, o?: ApiOptions) => request<T>("PUT", p, b, o),
  patch: <T>(p: string, b: unknown, o?: ApiOptions) =>
    request<T>("PATCH", p, b, o),
  del: <T>(p: string, o?: ApiOptions) => request<T>("DELETE", p, undefined, o),
};
export const q = (
  params: Record<string, string | number | undefined | null>,
) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && String(v) !== "") s.set(k, String(v));
  });
  return s.size ? `?${s.toString()}` : "";
};
