// // src/lib/dashboard-cache.ts

// export const DASH_KEYS = {
//   SCHEDULE: "dashboard.schedule",      // Course[]
//   TASKS: "dashboard.tasks",            // Task[]
//   EXPENSES: "dashboard.expensesCache", // Expense[]
//   BUDGET: "monthlyBudget",             // number (đã dùng ở Expenses)
// } as const;

// export type Course = { time: string; subject: string; room: string };

// export type Task = { title: string; deadline: string; subject?: string; done?: boolean };

// export type ExpenseLite = {
//   id?: string;
//   amount: number;
//   date: string;       // yyyy-MM-dd
//   time?: string;      // HH:mm
//   category?: string;  // FOOD | STUDY | TRANSPORT | OTHER | ...
//   description?: string | null;
//   paymentMethod?: string | null;
// };

// export function saveSchedule(courses: Course[]) {
//   localStorage.setItem(DASH_KEYS.SCHEDULE, JSON.stringify(courses));
//   window.dispatchEvent(new Event("dashboard:schedule-cache"));
// }
// export function loadSchedule(): Course[] {
//   try {
//     const raw = localStorage.getItem(DASH_KEYS.SCHEDULE);
//     return raw ? JSON.parse(raw) : [];
//   } catch {
//     return [];
//   }
// }

// export function saveTasks(tasks: Task[]) {
//   localStorage.setItem(DASH_KEYS.TASKS, JSON.stringify(tasks));
//   window.dispatchEvent(new Event("dashboard:tasks-cache"));
// }
// export function loadTasks(): Task[] {
//   try {
//     const raw = localStorage.getItem(DASH_KEYS.TASKS);
//     return raw ? JSON.parse(raw) : [];
//   } catch {
//     return [];
//   }
// }

// export function saveExpenses(expenses: ExpenseLite[]) {
//   localStorage.setItem(DASH_KEYS.EXPENSES, JSON.stringify(expenses));
//   window.dispatchEvent(new Event("dashboard:expenses-cache"));
// }
// export function loadExpenses(): ExpenseLite[] {
//   try {
//     const raw = localStorage.getItem(DASH_KEYS.EXPENSES);
//     return raw ? JSON.parse(raw) : [];
//   } catch {
//     return [];
//   }
// }

// src/lib/dashboard-cache.ts
import { getItem, setItem, getCurrentUserId } from "./user-storage.js";

export const DASH_KEYS = {
  SCHEDULE: "dashboard.schedule",      // Course[]
  TASKS: "dashboard.tasks",            // Task[]
  EXPENSES: "expenses",                // Expense[]  (per-user)
  BUDGET: "monthlyBudget",             // number (đã dùng ở Expenses)
} as const;

export type Course = { time: string; subject: string; room: string };

export type Task = { title: string; deadline: string; subject?: string; done?: boolean };

export type ExpenseLite = {
  id?: string;
  amount: number;
  date: string;       // yyyy-MM-dd
  time?: string;      // HH:mm
  category?: string;  // FOOD | STUDY | TRANSPORT | OTHER | ...
  description?: string | null;
  paymentMethod?: string | null;
};

/* ---------------- Schedule ---------------- */
export function saveSchedule(courses: Course[]) {
  localStorage.setItem(DASH_KEYS.SCHEDULE, JSON.stringify(courses));
  window.dispatchEvent(new Event("dashboard:schedule-cache"));
}
export function loadSchedule(): Course[] {
  try {
    const raw = localStorage.getItem(DASH_KEYS.SCHEDULE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ---------------- Tasks ---------------- */
export function saveTasks(tasks: Task[]) {
  localStorage.setItem(DASH_KEYS.TASKS, JSON.stringify(tasks));
  window.dispatchEvent(new Event("dashboard:tasks-cache"));
}
export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(DASH_KEYS.TASKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ---------------- Expenses (per-user) ---------------- */
// Migrate dữ liệu cũ từ key toàn cục (nếu có) sang key per-user một lần.
function migrateLegacyExpenses(uid: string): ExpenseLite[] {
  try {
    const raw = localStorage.getItem("dashboard.expensesCache"); // legacy global
    const legacy: ExpenseLite[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(legacy) && legacy.length) {
      // Lưu sang kho per-user mới
      setItem(uid, DASH_KEYS.EXPENSES, legacy);
      // Xoá key cũ để tránh lẫn lần sau
      try { localStorage.removeItem("dashboard.expensesCache"); } catch {}
      window.dispatchEvent(new Event("dashboard:expenses-cache"));
    }
    return legacy;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: ExpenseLite[], uid = getCurrentUserId()) {
  setItem(uid, DASH_KEYS.EXPENSES, expenses);
  window.dispatchEvent(new Event("dashboard:expenses-cache"));
}

export function loadExpenses(uid = getCurrentUserId()): ExpenseLite[] {
  // 1) Thử đọc kho per-user mới
  const scoped = getItem<ExpenseLite[]>(uid, DASH_KEYS.EXPENSES, []);
  if (Array.isArray(scoped) && scoped.length) return scoped;

  // 2) Nếu trống, migrate từ key legacy (nếu tồn tại)
  const migrated = migrateLegacyExpenses(uid);
  if (Array.isArray(migrated) && migrated.length) return migrated;

  // 3) Không có gì thì trả mảng rỗng
  return [];
}

