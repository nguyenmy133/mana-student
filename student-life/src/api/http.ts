// src/api/http.ts

/**
 * API base:
 * - Dùng proxy Vite: VITE_API_BASE = "/api"
 * - Gọi trực tiếp BE: VITE_API_BASE = "http://localhost:8080/api"
 */
const API_BASE_RAW = import.meta.env.VITE_API_BASE ?? "/api";
// Chuẩn hoá: bỏ dấu "/" cuối
const API_BASE = String(API_BASE_RAW).replace(/\/+$/, "");

const LS = { AT: "accessToken", RT: "refreshToken", USER: "user" };

const getAT = () => localStorage.getItem(LS.AT);
const getRT = () => localStorage.getItem(LS.RT);
const setAT = (t: string) => localStorage.setItem(LS.AT, t);
const setRT = (t: string) => localStorage.setItem(LS.RT, t);

export function logout(reason?: string) {
  [LS.AT, LS.RT, LS.USER].forEach((k) => localStorage.removeItem(k));
  if (reason) console.warn("[logout]", reason);
  window.location.assign("/login");
}

/** Endpoint KHÔNG gắn Authorization */
const SKIP_AUTH = [/\/users\/login$/, /\/users\/refresh$/, /\/users\/register$/];

/** Nối base + path và KHỬ double "/api" nếu trùng */
function buildUrl(input: string) {
  if (input.startsWith("http")) return input;

  let path = input.startsWith("/") ? input : `/${input}`;

  // Nếu base đã kết thúc bằng "/api" và path lại bắt đầu "/api/..." -> bỏ bớt "/api" ở path
  // ví dụ: base="/api", path="/api/expenses/..."  => "/api/expenses/..."
  //        base="http://.../api", path="/api/..." => "http://.../api/..."
  if (API_BASE.toLowerCase().endsWith("/api") && path.toLowerCase().startsWith("/api/")) {
    path = path.slice(4); // bỏ tiền tố "/api" trong path
  }

  return `${API_BASE}${path}`;
}

function normalizeForSkip(url: string) {
  return url.split("#")[0].split("?")[0];
}
function shouldSkipAuth(url: string) {
  const clean = normalizeForSkip(url);
  return SKIP_AUTH.some((re) => re.test(clean));
}

// ===== Refresh queue (tránh gọi chồng) =====
let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const rt = getRT();
  if (!rt) throw new Error("No refresh token");

  const url = buildUrl("/users/refresh");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
    mode: "cors",
    credentials: "omit",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Refresh failed");
  }
  if (!data?.accessToken) {
    throw new Error("No access token from refresh");
  }
  setAT(data.accessToken);
  if (data.refreshToken) setRT(data.refreshToken);
}

export async function ensureAuthOnBoot() {
  const hasAT = !!getAT();
  const hasRT = !!getRT();
  if (!hasAT && hasRT) {
    await doRefresh().catch(() => logout("refresh on boot failed"));
  }
}

async function ensureRefreshedOnce() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * authFetch: gắn Authorization (nếu cần), header mặc định an toàn
 */
export async function authFetch(input: string, init: RequestInit = {}) {
  const url = buildUrl(input);
  const headers = new Headers(init.headers || {});

  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (!shouldSkipAuth(url)) {
    const at = getAT();
    if (at) headers.set("Authorization", `Bearer ${at}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...init,
    headers,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });
}

/**
 * apiRequest: unwrap ResponseDTO<T> hoặc trả thẳng JSON
 * - Tự refresh 1 lần khi 401 (nếu có RT) rồi retry
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const exec = async () => {
    const res = await authFetch(path, init);
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // không phải JSON thì giữ nguyên
    }
    return { res, json };
  };

  let { res, json } = await exec();

  // 401 -> refresh 1 lần nếu có RT và endpoint không thuộc SKIP_AUTH
  if (res.status === 401 && !shouldSkipAuth(buildUrl(path)) && getRT()) {
    try {
      await ensureRefreshedOnce();
      ({ res, json } = await exec());
    } catch {
      logout("refresh failed");
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  if (!res.ok) {
    const detail =
      json?.message || json?.error || (typeof json === "string" ? json : "") || `HTTP ${res.status}`;
    throw new Error(detail);
  }

  // Unwrap ResponseDTO { data: T } nếu có, ngược lại trả nguyên json
  return (json?.data ?? json) as T;
}
