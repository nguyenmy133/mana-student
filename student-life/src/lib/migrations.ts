// src/lib/migrations.ts
import { getCurrentUserId, isGuest, getItem, setItem } from "@/lib/user-storage";
import type { ExpenseLite } from "@/lib/dashboard-cache";

const EXPENSES_KEY = "expenses";

/**
 * Chuyển dữ liệu từ app.user:guest:expenses sang app.user:<uid>:expenses
 * Gọi 1 lần ngay sau khi login/restore user.
 * Idempotent: chạy nhiều lần cũng không sao (vì xóa key guest sau khi chuyển).
 */
export function migrateGuestExpensesOnce(): void {
  const uid = getCurrentUserId();
  if (!uid || isGuest(uid)) return;

  const guestRaw = localStorage.getItem("app.user:guest:expenses");
  if (!guestRaw) return;

  let guest: ExpenseLite[] = [];
  try {
    guest = JSON.parse(guestRaw) || [];
    if (!Array.isArray(guest) || guest.length === 0) {
      localStorage.removeItem("app.user:guest:expenses");
      return;
    }
  } catch {
    // dữ liệu hỏng -> xoá rác
    localStorage.removeItem("app.user:guest:expenses");
    return;
  }

  // Lấy dữ liệu hiện có của user thật
  const current = getItem<ExpenseLite[]>(uid, EXPENSES_KEY, []);

  // Gộp không trùng (ưu tiên id; nếu không có id, dùng fingerprint cơ bản)
  const seen = new Set<string>();
  const toKey = (e: ExpenseLite) =>
    String(e.id ?? `${e.date}|${e.amount}|${(e.category || "").toUpperCase()}|${(e.description || "").trim()}`);

  for (const e of current) seen.add(toKey(e));

  const merged = current.slice();
  for (const e of guest) {
    const k = toKey(e);
    if (!seen.has(k)) {
      merged.push(e);
      seen.add(k);
    }
  }

  // Lưu cho user thật + xoá key guest
  setItem(uid, EXPENSES_KEY, merged);
  try {
    localStorage.removeItem("app.user:guest:expenses");
  } catch {}

  // Báo Dashboard reload
  window.dispatchEvent(new Event("dashboard:expenses-cache"));
}
