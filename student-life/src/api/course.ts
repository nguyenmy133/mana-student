import { request } from "@/lib/LoginAPI";

// ===== Types khớp ResponseDTO<Page<CourseDTO>> =====
export type CourseDTO = {
  id: string;
  nameCourse: string;
  description?: string;
  room: string;
  dayWeek: string;              // ví dụ "Thứ 2" | "Thứ 3" ...
  timeStudy: string;            // ISO datetime từ BE
  color: "blue"|"green"|"purple"|"orange"|"red";
};
export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number; };

export type SearchCourseDTO = { keyword?: string; page?: number; size?: number };
export type InsertCourseDTO = {
  nameCourse: string; description?: string; room: string;
  dayWeek: string;                     // cùng format BE
  timeStudy: string;                   // ISO "2025-10-06T08:00:00"
  color: CourseDTO["color"];
};

export function searchCourses(body: SearchCourseDTO) {
  return request<{code?:string; message?:string; data: Page<CourseDTO>}>("/courses/search", {
    method: "POST",
    body: JSON.stringify(body),
  }, true);
}
export function addCourse(body: InsertCourseDTO) {
  return request<{data: CourseDTO}>("/courses/add", { method: "POST", body: JSON.stringify(body) }, true);
}
export function updateCourse(id: string, body: InsertCourseDTO) {
  return request<{data: CourseDTO}>(`/courses/update/${id}`, { method: "PUT", body: JSON.stringify(body) }, true);
}
export function deleteCourse(id: string) {
  return request<{data: string}>(`/courses/delete/${id}`, { method: "DELETE" }, true);
}
