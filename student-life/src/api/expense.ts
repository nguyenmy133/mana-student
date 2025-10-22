// src/api/expense.ts
import { apiRequest } from "./http";

export type ExpenseCategory = "FOOD" | "STUDY" | "TRANSPORT" | "OTHER";
export type PaymentMethod = "CASH" | "BANK" | "CARD" | "EWALLET" | "OTHER";

export type SearchExpenseDTO = {
  pageIndex: number;
  pageSize: number;
  category?: ExpenseCategory | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  description?: string | null;
  startDate?: string | null; // "YYYY-MM-DDTHH:mm:ss"
  endDate?: string | null;   // "YYYY-MM-DDTHH:mm:ss"
  paymentMethod?: string | null;
};

export type ExpenseDTO = {
  id: string;
  amount: number | string; // BE có thể serialize BigDecimal thành string → FE vẫn nhận được
  category: ExpenseCategory;
  description?: string | null;
  expenseDate: string;      // "YYYY-MM-DDTHH:mm:ss"
  paymentMethod?: string | null;
};

export type PageDTO<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export const ExpenseAPI = {
  async search(payload: SearchExpenseDTO): Promise<PageDTO<ExpenseDTO>> {
    // gửi null thay vì '' cho các filter rỗng → khớp BE
    const clean: SearchExpenseDTO = {
      pageIndex: payload.pageIndex,
      pageSize: payload.pageSize,
      category: payload.category ?? null,
      minAmount: payload.minAmount ?? null,
      maxAmount: payload.maxAmount ?? null,
      description: payload.description?.trim() ? payload.description : null,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      paymentMethod: payload.paymentMethod ?? null,
    };
    return apiRequest<PageDTO<ExpenseDTO>>(`/api/expenses/search`, {
      method: "POST",
      body: JSON.stringify(clean),
    });
  },

  async add(dto: Omit<ExpenseDTO, "id">): Promise<ExpenseDTO> {
    return apiRequest<ExpenseDTO>(`/api/expenses/add`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async update(id: string, dto: Partial<Omit<ExpenseDTO, "id">>): Promise<ExpenseDTO> {
    return apiRequest<ExpenseDTO>(`/api/expenses/update/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    });
  },

  async remove(id: string): Promise<string> {
    return apiRequest<string>(`/api/expenses/delete/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
