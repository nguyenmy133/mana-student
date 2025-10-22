// src/lib/user-storage.ts

/** 
 * Lưu trữ theo từng user qua key: `${USER_NS}:${uid}:${key}`
 * Giải quyết việc "đụng" dữ liệu giữa các tài khoản khi dùng chung localStorage.
 */

const USER_NS = "app.user";
export const GUEST_ID = "guest";

/* -------------------- User Identity Helpers -------------------- */

/**
 * Cố gắng lấy userId từ nhiều nguồn quen thuộc trong app.
 * Bạn có thể sửa lại phần này để chỉ lấy từ một nơi duy nhất nếu app của bạn đã chuẩn hóa.
 */
function _probeUserId(): string | null {
  try {
    // 1) Biến global tạm thời (nếu app có set)
    const g: any = (globalThis as any);
    if (g && typeof g.__CURRENT_USER_ID__ === "string" && g.__CURRENT_USER_ID__) {
      return g.__CURRENT_USER_ID__;
    }

    // 2) Các key thường gặp trong localStorage của app
    const candidates = [
      "auth.currentUserId",
      "auth.userId",
      "currentUserId",
      "user.id",
      "auth.user", // JSON {"id": "..."}
    ];

    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (!v) continue;

      if (k === "auth.user") {
        try {
          const obj = JSON.parse(v);
          if (obj && typeof obj.id === "string" && obj.id) return obj.id;
        } catch { /* ignore */ }
      } else {
        if (typeof v === "string" && v.trim().length > 0) return v;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Lấy userId hiện tại; fallback "guest" nếu chưa đăng nhập. */
export function getCurrentUserId(): string {
  return _probeUserId() ?? GUEST_ID;
}

/** true nếu uid là guest (hoặc rỗng) */
export function isGuest(uid: string = getCurrentUserId()): boolean {
  return !uid || uid === GUEST_ID;
}

/** Chủ động set userId hiện tại (nếu app của bạn muốn điều khiển trực tiếp). */
export function setCurrentUserId(uid: string) {
  try {
    localStorage.setItem("auth.currentUserId", uid);
    (globalThis as any).__CURRENT_USER_ID__ = uid; // dùng ngay, không cần reload
  } catch { /* ignore */ }
}

/* -------------------- Namespaced Storage -------------------- */

function scopedKey(uid: string, key: string) {
  return `${USER_NS}:${uid}:${key}`;
}

function safeStringify(val: unknown): string {
  try { return JSON.stringify(val); } catch { return "null"; }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/**
 * Đọc item theo user cụ thể.
 * @param uid userId (bắt buộc — dùng getCurrentUserId() nếu muốn lấy theo user hiện tại)
 * @param key tên khóa logic (ví dụ: "expenses", "tasks"...)
 * @param fallback giá trị mặc định nếu không có
 */
export function getItem<T>(uid: string, key: string, fallback: T): T {
  const k = scopedKey(uid, key);
  try {
    const raw = localStorage.getItem(k);
    return safeParse<T>(raw, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Ghi item theo user cụ thể.
 * @param uid userId (bắt buộc — dùng getCurrentUserId() nếu muốn ghi theo user hiện tại)
 * @param key tên khóa logic
 * @param value giá trị cần lưu (sẽ được JSON.stringify)
 */
export function setItem(uid: string, key: string, value: unknown): void {
  const k = scopedKey(uid, key);
  try {
    localStorage.setItem(k, safeStringify(value));
  } catch { /* ignore quota or stringify errors */ }
}

/** Xóa một key trong namespace của user. */
export function removeItem(uid: string, key: string): void {
  const k = scopedKey(uid, key);
  try { localStorage.removeItem(k); } catch { /* ignore */ }
}

/** Xóa toàn bộ dữ liệu của một user trong namespace (cẩn thận khi dùng). */
export function clearUserNamespace(uid: string): void {
  try {
    const prefix = `${USER_NS}:${uid}:`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
