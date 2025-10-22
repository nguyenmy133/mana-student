// src/api/task.ts
import { apiRequest } from "@/api/http";

// ===== Types khớp BE =====
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskDTO = {
  id: string;
  title: string;
  description?: string;
  deadline?: string;        // ISO (LocalDateTime không 'Z' vẫn OK)
  status: TaskStatus;
  priority: TaskPriority;
  courseId?: string | null;
  createdDate?: string;
  lastModifiedDate?: string;
};

export type InsertTaskDTO = {
  title: string;
  description?: string;
  deadline?: string;        // "YYYY-MM-DDTHH:mm:ss"
  status: TaskStatus;
  priority: TaskPriority;
  courseId?: string | null;
};

export type UpdateTaskDTO = Partial<InsertTaskDTO>;

export type SearchTaskDTO = {
  title?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  deadline?: string | null;     // Nếu BE search theo 1 deadline duy nhất
  // Nếu BE hỗ trợ khoảng thời gian thì thêm: from?: string | null; to?: string | null;
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // page index
  size: number;     // page size
};

const base = "/tasks";

// Helpers
const clamp = (n: number, min: number, max = Infinity) =>
  Math.max(min, Math.min(max, Math.trunc(Number.isFinite(n as any) ? n : min)));

const clean = <T extends Record<string, any>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

// Chuẩn hoá mọi kiểu trả về về Page<TaskDTO>
function toPage(listOrPage: any, pageIndex: number, pageSize: number): Page<TaskDTO> {
  const d = listOrPage ?? [];
  if (Array.isArray(d)) {
    return {
      content: d,
      totalElements: d.length,
      totalPages: 1,
      number: pageIndex,
      size: pageSize,
    };
  }
  if (Array.isArray(d.content)) {
    return {
      content: d.content,
      totalElements: d.totalElements ?? d.content.length,
      totalPages: d.totalPages ?? 1,
      number: d.number ?? pageIndex,
      size: d.size ?? pageSize,
    };
  }
  // fallback rỗng
  return { content: [], totalElements: 0, totalPages: 0, number: pageIndex, size: pageSize };
}

export const TaskAPI = {
  // CREATE — BE: POST /api/tasks/add
  add: (dto: InsertTaskDTO) =>
    apiRequest<TaskDTO>(`${base}/add`, {
      method: "POST",
      body: JSON.stringify(clean(dto as any)),
    }),

  // UPDATE — BE: PUT /api/tasks/update/{id}
  update: (id: string, dto: UpdateTaskDTO) =>
    apiRequest<TaskDTO>(`${base}/update/${id}`, {
      method: "PUT",
      body: JSON.stringify(clean(dto as any)),
    }),

  // DELETE — BE: DELETE /api/tasks/delete/{id}
  remove: (id: string) =>
    apiRequest<string | null>(`${base}/delete/${id}`, { method: "DELETE" }),

  // (BE hiện không có GET /api/tasks/{id}; nếu cần thì bổ sung bên BE trước)
  // get: (id: string) => apiRequest<TaskDTO>(`${base}/${id}`),

  // SEARCH — BE: POST /api/tasks/search  (trả về ResponseDTO<List<TaskDTO>>)
  // FE chuẩn hoá thành Page<TaskDTO> để Tasks.tsx dùng như cũ
  async search(body: SearchTaskDTO = {}, pageIndex = 0, pageSize = 100) {
    const payload = {
      pageIndex: clamp(pageIndex, 0),
      pageSize: clamp(pageSize, 1),
      ...clean(body as any),
    };
    const res = await apiRequest<any>(`${base}/search`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // apiRequest đã unwrap ResponseDTO.data -> res là List<TaskDTO>
    return toPage(res, payload.pageIndex, payload.pageSize);
  },
};

// Helper datetime: Date -> "YYYY-MM-DDTHH:mm:ss" (LocalDateTime)
export function toLocalDateTimeString(d: Date | string | undefined) {
  if (!d) return undefined;
  const x = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const yyyy = x.getFullYear();
  const MM = pad(x.getMonth() + 1);
  const dd = pad(x.getDate());
  const HH = pad(x.getHours());
  const mm = pad(x.getMinutes());
  const ss = pad(x.getSeconds());
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
}
