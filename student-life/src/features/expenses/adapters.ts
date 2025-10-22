// src/features/expenses/adapters.ts
import type { ExpenseCategory, ExpenseDTO, PaymentMethod } from "@/api/expense";

export type UiExpense = {
  id?: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  paymentMethod?: string;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function toInsert(ui: UiExpense): Omit<ExpenseDTO, "id"> {
  const hhmm = ui.time?.length === 5 ? `${ui.time}:00` : ui.time || "00:00:00";
  return {
    amount: ui.amount,
    category: ui.category,
    description: ui.description || "",
    expenseDate: `${ui.date}T${hhmm}`,
    paymentMethod: (ui.paymentMethod as PaymentMethod) || "CASH",
  };
}

export function toUpdate(ui: UiExpense): Partial<Omit<ExpenseDTO, "id">> {
  const hhmm = ui.time?.length === 5 ? `${ui.time}:00` : ui.time || "00:00:00";
  return {
    amount: ui.amount,
    category: ui.category,
    description: ui.description || "",
    expenseDate: `${ui.date}T${hhmm}`,
    paymentMethod: ui.paymentMethod || "CASH",
  };
}

export function toUi(dto: ExpenseDTO): UiExpense {
  const [d, t = "00:00:00"] = (dto.expenseDate || "").split("T");
  return {
    id: dto.id,
    amount: toNumber(dto.amount),
    category: dto.category,
    description: dto.description || "",
    date: d || new Date().toISOString().slice(0, 10),
    time: t.slice(0, 5),
    paymentMethod: dto.paymentMethod || "CASH",
  };
}

export const toUiSafe = toUi;
