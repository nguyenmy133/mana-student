"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ========= API helper ========= */
const API_BASE_URL = "http://localhost:8080/api";

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { method = "GET", headers: customHeaders, body } = options;

  const headers: HeadersInit = { "Content-Type": "application/json", ...customHeaders };
  const token = localStorage.getItem("accessToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Lỗi không xác định từ server" }));
    throw new Error(err.message || `Lỗi ${res.status}: ${res.statusText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

/* ========= Types ========= */
type CourseDTO = {
  id: string;
  nameCourse: string;
  description?: string;
  room?: string;
  dayWeek: string;        
  timeStudy: string;      
  timeStudyEnd?: string;  
  color?: string;
};

type CourseFormValues = {
  nameCourse: string;
  description: string;
  room: string;
  dayWeek: string;
  studyDate: string; 
  startTime: string; 
  endTime: string;   
  color: string;
};

/* ========= Schema ========= */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const courseFormSchema = z.object({
  nameCourse: z.string().min(1, "Tên môn học là bắt buộc"),
  room: z.string().optional(),
  description: z.string().optional(),
  dayWeek: z.string().min(1, "Vui lòng chọn ngày học trong tuần"),
  studyDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Ngày học không hợp lệ" }),
  startTime: z.string().regex(timeRegex, "Giờ bắt đầu không hợp lệ (HH:MM)"),
  endTime: z.string().regex(timeRegex, "Giờ kết thúc không hợp lệ (HH:MM)"),
  color: z.string().min(1, "Màu sắc là bắt buộc"),
}).refine((d) => d.endTime > d.startTime, {
  message: "Giờ kết thúc phải sau giờ bắt đầu",
  path: ["endTime"],
});

/* ========= Helpers ========= */
const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;
const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 border-blue-300 text-blue-800",
  green: "bg-green-100 border-green-300 text-green-800",
  purple: "bg-purple-100 border-purple-300 text-purple-800",
  orange: "bg-orange-100 border-orange-300 text-orange-800",
  red: "bg-red-100 border-red-300 text-red-800",
  gray: "bg-gray-100 border-gray-300 text-gray-800",
};


type DashCourse = { time: string; subject: string; room: string };
const TODAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]; // JS getDay() 0..6
function todayLabel(): string {
  const idx = new Date().getDay();
  return TODAY_LABELS[idx];
}
function toDashCoursesToday(list: CourseDTO[]): DashCourse[] {
  const label = todayLabel();
  return list
    .filter((c) => c.dayWeek === label && typeof c.timeStudy === "string")
    .map((c) => ({
      time: c.timeStudy.substring(11, 16),
      subject: c.nameCourse,
      room: c.room || "",
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}
function writeDashboardSchedule(list: CourseDTO[]) {
  try {
    const todayArr = toDashCoursesToday(list);
    localStorage.setItem("dashboard.schedule", JSON.stringify(todayArr));

    window.dispatchEvent(new Event("dashboard:schedule-cache"));
  } catch {}
}

/* ========= Component ========= */
export const Schedule = () => {
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDTO | null>(null);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      nameCourse: "", room: "", description: "", dayWeek: "",
      studyDate: "", startTime: "07:00", endTime: "09:00", color: "blue",
    },
  });

  /* ===== API ===== */
  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
  
      const res = await apiRequest<{ data: CourseDTO[] }>("/courses/my-courses", { method: "GET" });
      const list = res?.data ?? [];
      setCourses(list);
      
      writeDashboardSchedule(list);
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu lịch học.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const onSubmit = async (values: CourseFormValues) => {
    try {
      const timeStudy = `${values.studyDate}T${values.startTime}:00`;
      const timeStudyEnd = `${values.studyDate}T${values.endTime}:00`;

      const payload = {
        nameCourse: values.nameCourse,
        description: values.description,
        room: values.room,
        dayWeek: values.dayWeek,
        timeStudy,
        timeStudyEnd,
        color: values.color,
      };

      if (editingCourse) {
        await apiRequest(`/courses/update/${editingCourse.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/courses/add", { method: "POST", body: JSON.stringify(payload) });
      }

      setDialogOpen(false);
      await fetchCourses(); 
    } catch (err: any) {
      form.setError("root", { message: err.message || "Thao tác thất bại." });
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa môn học này?")) return;
    try {
      await apiRequest(`/courses/delete/${courseId}`, { method: "DELETE" });
      await fetchCourses(); 
    } catch (err: any) {
      setError(err.message || "Xóa thất bại.");
    }
  };

  /* ===== UI handlers ===== */
  const handleOpenDialog = (course: CourseDTO | null) => {
    setEditingCourse(course);
    if (course) {
      const startDate = new Date(course.timeStudy);
      const endDate = course.timeStudyEnd ? new Date(course.timeStudyEnd) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      form.reset({
        nameCourse: course.nameCourse,
        description: course.description || "",
        room: course.room || "",
        dayWeek: course.dayWeek,
        studyDate: startDate.toISOString().split("T")[0],
        startTime: startDate.toTimeString().substring(0, 5),
        endTime: endDate.toTimeString().substring(0, 5),
        color: course.color || "blue",
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      form.reset({
        nameCourse: "", room: "", description: "", dayWeek: "",
        studyDate: today, startTime: "07:00", endTime: "09:00", color: "blue",
      });
    }
    setDialogOpen(true);
  };

  
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 7; h < 20; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  const getCourseStartingAt = (day: string, slot: string): CourseDTO | null => {
    const slotTime = slot.substring(0, 5);
    return (
      courses.find((c) => {
        if (!c.timeStudy) return false;
        const courseStartTime = c.timeStudy.substring(11, 16);
        return c.dayWeek === day && courseStartTime === slotTime;
      }) || null
    );
  };

  /* ===== Render ===== */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lịch học</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm môn học
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thời khóa biểu tuần</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm min-w-[900px]">
              <thead>
                <tr>
                  <th className="border p-2 w-20">Giờ</th>
                  {weekDays.map((d) => (
                    <th key={d} className="border p-2 text-center">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot}>
                    <td className="border p-2 font-medium text-center">{slot}</td>
                    {weekDays.map((day) => {
                      const course = getCourseStartingAt(day, slot);
                      if (!course) return <td key={`${day}-${slot}`} className="border p-0"></td>;

                      const startMin = toMinutes(course.timeStudy.substring(11, 16));
                      const endMin = course.timeStudyEnd
                        ? toMinutes(course.timeStudyEnd.substring(11, 16))
                        : startMin + 120;
                      const durationSlots = Math.max(1, Math.round((endMin - startMin) / 30));

                      return (
                        <td
                          key={`${day}-${slot}`}
                          className="border p-1 align-top"
                          rowSpan={durationSlots}
                        >
                          <div
                            className={`relative group h-full rounded p-2 text-xs ${colorMap[course.color || "gray"]}`}
                          >
                            <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={() => handleOpenDialog(course)}
                                className="p-1 rounded bg-white/80 shadow hover:bg-white"
                                title="Cập nhật"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(course.id)}
                                className="p-1 rounded bg-white/80 shadow hover:bg-white"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </button>
                            </div>
                            <div className="font-bold">{course.nameCourse}</div>
                            <div>Phòng: {course.room}</div>
                            <div className="mt-1 opacity-80 truncate" title={course.description}>
                              {course.description}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Cập nhật môn học" : "Thêm môn học mới"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nameCourse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên môn học</FormLabel>
                    <FormControl>
                      <Input placeholder="Toán cao cấp..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phòng học</FormLabel>
                      <FormControl>
                        <Input placeholder="A101..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dayWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thứ</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn thứ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weekDays.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="studyDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vào ngày</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giờ bắt đầu</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giờ kết thúc</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Màu sắc</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn màu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(colorMap).map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ghi chú thêm..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCourse ? "Lưu thay đổi" : "Thêm môn học"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
