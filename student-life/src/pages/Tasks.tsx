// src/pages/Tasks.tsx  (hoặc đường dẫn bạn đang dùng)
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, Calendar as CalendarIcon, CheckSquare, Search, Pencil, Trash2 } from "lucide-react";

import { TaskAPI, type TaskDTO } from "@/api/task";

/* ==========================
   Helpers datetime (LocalDateTime chuỗi, không có 'Z')
   ========================== */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM
const combineDateTimeToLocal = (date: Date, timeHHMM: string) => {
  const [h, m] = timeHHMM.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`;
};
const isoToDate = (iso?: string) => (iso ? new Date(iso) : undefined);
const isoToTimeHHMM = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "09:00";

/* ==========================
   UI types & map API <-> UI
   ========================== */
type UiPriority = "high" | "medium" | "low";
type UiStatus = "todo" | "doing" | "done";
type UiCategory = "học tập" | "làm việc" | "khác"; // FE-only

type UiTask = {
  id: string;
  title: string;
  description: string;
  category: UiCategory; // FE-only
  deadline: string; // ISO
  status: UiStatus;
  priority: UiPriority;
};

const apiStatusToUi = (s: TaskDTO["status"]): UiStatus =>
  s === "DONE" ? "done" : s === "IN_PROGRESS" ? "doing" : "todo";

const uiStatusToApi = (s: UiStatus): TaskDTO["status"] =>
  s === "done" ? "DONE" : s === "doing" ? "IN_PROGRESS" : "TODO";

const apiPriorityToUi = (p: TaskDTO["priority"]): UiPriority =>
  p === "LOW" ? "low" : p === "HIGH" || p === "URGENT" ? "high" : "medium";

const uiPriorityToApi = (p: UiPriority): TaskDTO["priority"] =>
  p === "low" ? "LOW" : p === "high" ? "HIGH" : "MEDIUM";

const dtoToUi = (t: TaskDTO): UiTask => ({
  id: t.id,
  title: t.title,
  description: t.description ?? "",
  category: "khác", // BE không có -> mặc định, sẽ áp lại từ localStorage
  deadline: t.deadline ?? new Date().toISOString(),
  status: apiStatusToUi(t.status),
  priority: apiPriorityToUi(t.priority),
});

/* ==========================
   LocalStorage cho category (FE-only)
   ========================== */
const CAT_KEY = "task_ui_categories_v1";
const loadCatMap = (): Record<string, UiCategory> => {
  try {
    return JSON.parse(localStorage.getItem(CAT_KEY) ?? "{}");
  } catch {
    return {};
  }
};
const saveCat = (id: string, cat: UiCategory) => {
  const m = loadCatMap();
  m[id] = cat;
  localStorage.setItem(CAT_KEY, JSON.stringify(m));
};
const removeCat = (id: string) => {
  const m = loadCatMap();
  delete m[id];
  localStorage.setItem(CAT_KEY, JSON.stringify(m));
};

/* ==========================
   Dashboard cache (ghi để Dashboard không cần gọi API)
   ========================== */
type DashTask = {
  id: string;
  title: string;
  deadline: string;
  category: UiCategory;
  priority: UiPriority;
  status: UiStatus;
};
const DASH_TASKS_KEY = "dashboard.tasks";

function writeDashTasksFromUi(list: UiTask[]) {
  const data: DashTask[] = list.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    category: t.category,
    priority: t.priority,
    status: t.status,
  }));
  // sort deadline ASC
  data.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  localStorage.setItem(DASH_TASKS_KEY, JSON.stringify(data));
  // thông báo cho Dashboard
  window.dispatchEvent(new Event("dashboard:tasks"));
}

/* ==========================
   Component
   ========================== */
export const Tasks = () => {
  const [filterCategory, setFilterCategory] = useState<"all" | UiCategory>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const priorities = ["high", "medium", "low"] as const;
  const categories = ["học tập", "làm việc", "khác"] as const;

  const [tasks, setTasks] = useState<UiTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  /* ====== Form schema ====== */
  const taskFormSchema = z
    .object({
      title: z.string().min(1, "Tiêu đề task là bắt buộc"),
      description: z.string().optional(),
      category: z.enum(categories, { required_error: "Danh mục là bắt buộc" }),
      deadlineDate: z.date({ required_error: "Hạn chót là bắt buộc" }),
      deadlineTime: z.string().regex(timeRegex, "Giờ không hợp lệ (HH:MM)"),
      priority: z.enum(priorities, { required_error: "Độ ưu tiên là bắt buộc" }),
    })
    .refine((d) => !!d.deadlineDate && timeRegex.test(d.deadlineTime), {
      message: "Ngày/Giờ không hợp lệ",
      path: ["deadlineTime"],
    });

  type TaskForm = z.infer<typeof taskFormSchema>;

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "học tập",
      deadlineDate: undefined,
      deadlineTime: "09:00",
      priority: "medium",
    },
  });

  /* ====== Load danh sách từ API ====== */
  const loadTasks = async () => {
    try {
      setLoading(true);
      const page = await TaskAPI.search({}, 0, 100); // apiRequest trả trực tiếp Page<TaskDTO>
      const catMap = loadCatMap();
      const list = page.content.map((d) => {
        const ui = dtoToUi(d);
        ui.category = catMap[d.id] ?? "khác";
        return ui;
      });
      setTasks(list);
      // ✅ ghi cache cho Dashboard
      writeDashTasksFromUi(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const resetFormToCreate = () => {
    form.reset({
      title: "",
      description: "",
      category: "học tập",
      deadlineDate: undefined,
      deadlineTime: "09:00",
      priority: "medium",
    });
    setEditingTaskId(null);
  };

  const onSubmit = async (values: TaskForm) => {
    const deadline = combineDateTimeToLocal(values.deadlineDate, values.deadlineTime);
    try {
      if (editingTaskId !== null) {
        await TaskAPI.update(editingTaskId, {
          title: values.title,
          description: values.description ?? "",
          deadline,
          priority: uiPriorityToApi(values.priority),
        });
        // optimistic update + lưu category FE-only
        setTasks((prev) => {
          const next = prev.map((t) =>
            t.id === editingTaskId
              ? {
                  ...t,
                  title: values.title,
                  description: values.description ?? "",
                  category: values.category,
                  deadline,
                  priority: values.priority,
                }
              : t
          );
          // ✅ ghi cache
          writeDashTasksFromUi(next);
          return next;
        });
        saveCat(editingTaskId, values.category);
      } else {
        const created = await TaskAPI.add({
          title: values.title,
          description: values.description ?? "",
          deadline,
          status: "TODO",
          priority: uiPriorityToApi(values.priority),
        });
        const ui = dtoToUi(created);
        ui.category = values.category; // giữ category FE
        saveCat(ui.id, ui.category);
        setTasks((prev) => {
          const next = [ui, ...prev];
          // ✅ ghi cache
          writeDashTasksFromUi(next);
          return next;
        });
      }
    } catch (e) {
      console.error(e);
      alert("Có lỗi khi lưu task");
    }

    setDialogOpen(false);
    resetFormToCreate();
  };

  /* ====== Helpers render ====== */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-red-100 text-red-800 border-red-200";
      case "doing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "doing":
        return "Doing";
      case "done":
        return "Done";
      default:
        return status;
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  /* ====== Filter (FE) ====== */
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const byCategory = filterCategory === "all" || task.category === filterCategory;
      const term = searchTerm.trim().toLowerCase();
      const bySearch =
        !term ||
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.category.toLowerCase().includes(term);
      const byDate = !filterDate || isSameDay(new Date(task.deadline), filterDate);
      return byCategory && bySearch && byDate;
    });
  }, [tasks, filterCategory, searchTerm, filterDate]);

  /* ====== CRUD UI helpers ====== */
  const startEditTask = (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    form.reset({
      title: t.title,
      description: t.description ?? "",
      category: t.category,
      deadlineDate: isoToDate(t.deadline),
      deadlineTime: isoToTimeHHMM(t.deadline),
      priority: t.priority,
    });
    setEditingTaskId(taskId);
    setDialogOpen(true);
  };

  const requestDeleteTask = (taskId: string) => {
    setDeleteCandidateId(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!deleteCandidateId) return;
    try {
      await TaskAPI.remove(deleteCandidateId);
      setTasks((prev) => {
        const next = prev.filter((x) => x.id !== deleteCandidateId);
        // ✅ ghi cache
        writeDashTasksFromUi(next);
        return next;
      });
      removeCat(deleteCandidateId);
    } catch (e) {
      console.error(e);
      alert("Xóa task thất bại");
    } finally {
      setDeleteCandidateId(null);
      setDeleteDialogOpen(false);
    }
  };

  const cancelDelete = () => {
    setDeleteCandidateId(null);
    setDeleteDialogOpen(false);
  };

  // Toggle DONE <-> TODO (giữ bố cục, Doing không dùng ở checkbox)
  const toggleDone = async (task: UiTask, checked: boolean) => {
    const newUiStatus: UiStatus = checked ? "done" : "todo";
    const old = task.status;
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === task.id ? { ...t, status: newUiStatus } : t));
      // ✅ ghi cache
      writeDashTasksFromUi(next);
      return next;
    });
    try {
      await TaskAPI.update(task.id, { status: uiStatusToApi(newUiStatus) });
    } catch (e) {
      console.error(e);
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === task.id ? { ...t, status: old } : t));
        // quay lại cache cũ
        writeDashTasksFromUi(next);
        return next;
      });
      alert("Cập nhật trạng thái thất bại");
    }
  };

  // Action buttons (hover-only)
  const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={onEdit}
        title="Sửa"
        className="inline-flex items-center justify-center rounded border bg-white/80 p-1 text-muted-foreground shadow-sm hover:bg-white"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Xóa"
        className="inline-flex items-center justify-center rounded border bg-white/80 p-1 text-muted-foreground shadow-sm hover:bg-white"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý công việc</h1>
            <p className="text-muted-foreground">Quản lý công việc và bài tập của bạn</p>
          </div>
        </div>

        {/* Add / Edit Task Dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) resetFormToCreate();
            setDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Thêm task</span>
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTaskId !== null ? "Cập nhật task" : "Thêm task mới"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiêu đề</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tiêu đề task" {...field} />
                      </FormControl>
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
                        <Textarea placeholder="Nhập mô tả" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Độ ưu tiên</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn độ ưu tiên" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">Cao</SelectItem>
                            <SelectItem value="medium">Trung bình</SelectItem>
                            <SelectItem value="low">Thấp</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Danh mục (UI)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="học tập">Học tập</SelectItem>
                            <SelectItem value="làm việc">Làm việc</SelectItem>
                            <SelectItem value="khác">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deadlineDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Chọn hạn chót</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Chọn ngày"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadlineTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chọn giờ</FormLabel>
                        <FormControl>
                          <Input type="time" step={60} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetFormToCreate();
                    }}
                  >
                    Hủy
                  </Button>
                  <Button type="submit">{editingTaskId !== null ? "Cập nhật" : "Lưu"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Lọc theo danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            <SelectItem value="học tập">Học tập</SelectItem>
            <SelectItem value="làm việc">Làm việc</SelectItem>
            <SelectItem value="khác">Khác</SelectItem>
          </SelectContent>
        </Select>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 w-72"
            placeholder="Tìm kiếm theo tiêu đề, mô tả, danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate ? format(filterDate, "dd/MM/yyyy") : "Lọc theo ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={filterDate} onSelect={setFilterDate} />
          </PopoverContent>
        </Popover>
        {filterDate && (
          <Button variant="ghost" onClick={() => setFilterDate(undefined)}>
            Bỏ lọc ngày
          </Button>
        )}
      </div>

      {/* List */}
      <div className="grid gap-4">
        {loading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">Đang tải...</CardContent>
          </Card>
        )}

        {!loading &&
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow relative group">
              <CardContent className="p-4">
                {/* Action buttons */}
                <ActionButtons onEdit={() => startEditTask(task.id)} onDelete={() => requestDeleteTask(task.id)} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={task.status === "done"}
                      onCheckedChange={(checked) => toggleDone(task, checked === true)}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                      <div>
                        <h3 className={`font-medium text-foreground ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{task.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {new Date(task.deadline).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <Badge className={getStatusColor(task.status)}>{getStatusText(task.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {!loading && filteredTasks.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">Không có task phù hợp.</CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) cancelDelete();
          setDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Bạn chắc chắn muốn xóa task{" "}
              <strong>{deleteCandidateId ? tasks.find((t) => t.id === deleteCandidateId)?.title : ""}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>
                Hủy
              </Button>
              <Button onClick={confirmDeleteTask}>Xóa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
