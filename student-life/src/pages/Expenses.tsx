// src/pages/Expenses.tsx
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ExpenseAPI, type ExpenseCategory, type SearchExpenseDTO } from "@/api/expense";
import { toUi, toInsert, toUpdate, type UiExpense } from "@/features/expenses/adapters";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, TrendingDown, PieChart, Target, AlertCircle, DollarSign, Pencil, Trash2 } from "lucide-react";

/* ===== constants & schema ===== */
const categoryOptions: ExpenseCategory[] = ["FOOD","STUDY","TRANSPORT","OTHER"];
const paymentOptions = ["CASH","BANK","CARD","EWALLET","OTHER"];

const expenseFormSchema = z.object({
  amount: z.string().refine((v) => !isNaN(+v) && +v > 0, "Số tiền > 0"),
  category: z.string().min(1, "Chọn danh mục"),
  description: z.string().optional(),
  date: z.string().min(1, "Chọn ngày"),
  time: z.string().min(1, "Chọn giờ"),
  paymentMethod: z.string().optional(),
});

/* ===== helpers for UI mapping ===== */
function splitIso(iso?: string) {
  if (!iso || typeof iso !== "string") {
    const today = new Date();
    const p = (n:number)=>String(n).padStart(2,"0");
    return { date: `${today.getFullYear()}-${p(today.getMonth()+1)}-${p(today.getDate())}`, time: "00:00" };
  }
  const [d, t] = iso.split("T");
  return { date: d || iso.slice(0,10), time: (t || "00:00:00").slice(0,5) };
}
function toUiSafe(dto: any): UiExpense {
  try {
    const mapped = toUi(dto);
    if (!mapped.date || !mapped.time) {
      const { date, time } = splitIso(dto?.expenseDate);
      return { ...mapped, date, time };
    }
    return mapped;
  } catch {
    const { date, time } = splitIso(dto?.expenseDate);
    return {
      id: dto?.id ?? `${date}-${time}-${dto?.amount ?? 0}-${Math.random().toString(36).slice(2)}`,
      amount: Number(dto?.amount ?? 0),
      category: (dto?.category as ExpenseCategory) ?? "OTHER",
      description: dto?.description ?? "",
      date, time,
      paymentMethod: dto?.paymentMethod ?? "CASH",
    };
  }
}
function isInSameMonth(dateStr: string, ref: Date) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
function monthRange(ref: Date) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const pad = (n:number)=>String(n).padStart(2,"0");
  const start = `${y}-${pad(m+1)}-01T00:00:00`;
  const lastDay = new Date(y, m+1, 0).getDate();
  const end = `${y}-${pad(m+1)}-${pad(lastDay)}T23:59:59`;
  return { start, end };
}

/* ===== Dashboard cache helpers (localStorage) ===== */
type ExpenseLite = {
  id?: string;
  amount: number;
  category: string;
  date: string;
  time: string;
  description?: string | null;
  paymentMethod?: string | null;
};
const DASH_EXP_KEY = "dashboard.expensesCache";

function readDash(): ExpenseLite[] {
  try {
    const raw = localStorage.getItem(DASH_EXP_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function makeKey(e: ExpenseLite) {
  return e.id ?? `${e.date}-${e.time}-${e.amount}-${e.category}`;
}
function toLite(e: UiExpense): ExpenseLite {
  return {
    id: e.id,
    amount: e.amount,
    category: e.category,
    date: e.date,
    time: e.time,
    description: e.description ?? null,
    paymentMethod: e.paymentMethod ?? null,
  };
}
function writeDash(next: ExpenseLite[]) {
  // sort desc by datetime
  next.sort((a, b) => (b.date + "T" + (b.time || "00:00")).localeCompare(a.date + "T" + (a.time || "00:00")));
  // giữ tối đa 100 bản ghi gần nhất để dashboard nhẹ
  const trimmed = next.slice(0, 100);
  localStorage.setItem(DASH_EXP_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new Event("dashboard:expenses-cache"));
}
function mergeDash(addList: UiExpense[]) {
  if (!addList.length) return;
  const base = readDash();
  const map = new Map<string, ExpenseLite>(base.map((x) => [makeKey(x), x]));
  for (const it of addList) {
    const lite = toLite(it);
    map.set(makeKey(lite), lite);
  }
  writeDash(Array.from(map.values()));
}
function upsertDash(e: UiExpense) {
  mergeDash([e]);
}
function removeFromDash(e: UiExpense) {
  const base = readDash();
  const key = makeKey(toLite(e));
  writeDash(base.filter((x) => makeKey(x) !== key));
}

export default function Expenses() {
  /* ---- states ---- */
  const [items, setItems] = useState<UiExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [fCategory, setFCategory] = useState<ExpenseCategory | "ALL">("ALL");
  const [fPayment, setFPayment] = useState<string | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [fMin, setFMin] = useState<string>("");
  const [fMax, setFMax] = useState<string>("");
  const [fStart, setFStart] = useState<string>("");
  const [fEnd, setFEnd] = useState<string>("");

  const [queryNonce, setQueryNonce] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UiExpense | null>(null);

  // Ngân sách tháng (localStorage)
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const saved = localStorage.getItem("monthlyBudget");
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5_000_000;
  });
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>(String(monthlyBudget));
  useEffect(() => { localStorage.setItem("monthlyBudget", String(monthlyBudget)); }, [monthlyBudget]);
  const handleSaveBudget = () => {
    const next = Number(budgetInput);
    if (Number.isFinite(next) && next >= 0) { setMonthlyBudget(next); setEditBudgetOpen(false); }
    else alert("Vui lòng nhập một số hợp lệ cho ngân sách.");
  };

  // ✅ Tổng chi của THÁNG HIỆN TẠI (độc lập với trang/pagination)
  const [monthlySpent, setMonthlySpent] = useState<number>(0);

  // Tính key tháng để khi sang tháng mới sẽ tự reload tổng
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  // Hàm tính lại tổng chi trong tháng bằng cách query tất cả bản ghi của tháng hiện tại
  const recalcMonthlySpent = async () => {
    const { start, end } = monthRange(new Date());
    const PS = 200;
    let idx = 0;
    let pages = 1;
    let sum = 0;

    while (idx < pages) {
      const page = await ExpenseAPI.search({
        pageIndex: idx,
        pageSize: PS,
        category: null,
        minAmount: null,
        maxAmount: null,
        description: null,
        startDate: start,
        endDate: end,
        paymentMethod: null,
      } as SearchExpenseDTO);

      const list = Array.isArray(page?.content) ? page.content : [];
      for (const dto of list) {
        const amount = typeof dto.amount === "string" ? Number(dto.amount) : (dto.amount as number);
        sum += Number.isFinite(amount) ? amount : 0;
      }

      pages = page?.totalPages ?? 1;
      idx += 1;
    }
    setMonthlySpent(sum);
  };

  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: { amount: "", category: "", description: "", date: "", time: "", paymentMethod: "" },
  });
  const editForm = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: { amount: "", category: "", description: "", date: "", time: "", paymentMethod: "" },
  });

  /* ---- fetch (danh sách theo trang) ---- */
  const fetchData = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const payload: SearchExpenseDTO = {
        pageIndex,
        pageSize,
        category: fCategory === "ALL" ? null : (fCategory as any),
        description: searchQuery?.trim() ? searchQuery : null,
        minAmount: fMin ? +fMin : null,
        maxAmount: fMax ? +fMax : null,
        startDate: fStart ? `${fStart}T00:00:00` : null,
        endDate: fEnd ? `${fEnd}T23:59:59` : null,
        paymentMethod: fPayment === "ALL" ? null : fPayment,
      };

      const page = await ExpenseAPI.search(payload);

      if (!page || !Array.isArray(page.content)) {
        throw new Error("Dữ liệu trả về không đúng định dạng trang.");
      }

      const uiList = (page.content as any[]).map(toUiSafe);
      setItems(uiList);
      setTotalPages(page.totalPages ?? 0);
      setPageIndex(page.number ?? pageIndex);
      setPageSize(page.size ?? pageSize);

      // ✅ đồng bộ cache dashboard bằng trang dữ liệu mới nhất (ưu tiên tháng hiện tại)
      const thisMonth = uiList.filter((x) => isInSameMonth(x.date, new Date()));
      mergeDash(thisMonth.length ? thisMonth : uiList);
    } catch (e: any) {
      console.error("[Expenses] fetch error:", e);
      setItems([]);
      setTotalPages(0);
      setErrMsg(e?.message || "Không thể tải dữ liệu chi tiêu.");
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách theo trang
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [pageIndex, pageSize, queryNonce]);

  // Tính tổng chi tháng khi vừa vào/tháng đổi
  useEffect(() => { recalcMonthlySpent(); }, [monthKey]);

  /* ---- handlers ---- */
  const onSubmit = async (values: z.infer<typeof expenseFormSchema>) => {
    try {
      const ui: UiExpense = {
        amount: +values.amount,
        category: values.category as ExpenseCategory,
        description: values.description,
        date: values.date,
        time: values.time,
        paymentMethod: values.paymentMethod || "CASH",
      };

      const created = await ExpenseAPI.add(toInsert(ui));
      const createdUi = toUiSafe(created);

      // Hiển thị ngay trong bảng
      setItems(prev => [createdUi, ...prev]);

      // ✅ Cập nhật tổng chi tháng ngay lập tức nếu thuộc tháng hiện tại
      if (isInSameMonth(createdUi.date, new Date())) {
        setMonthlySpent(prev => prev + createdUi.amount);
      }

      // ✅ cập nhật cache dashboard
      upsertDash(createdUi);

      setDialogOpen(false);
      form.reset();

      // đảm bảo thấy item mới ở trang 0 (và đồng bộ lại danh sách)
      setPageIndex(0);
      setQueryNonce(n => n + 1);
    } catch (e: any) {
      console.error("[Expenses] add failed:", e);
      alert(e?.message || "Thêm chi tiêu thất bại");
    }
  };

  const openEdit = (it: UiExpense) => {
    setEditing(it);
    editForm.reset({
      amount: String(it.amount),
      category: it.category,
      description: it.description,
      date: it.date,
      time: it.time,
      paymentMethod: it.paymentMethod || "",
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof expenseFormSchema>) => {
    if (!editing?.id) return;
    try {
      const before = editing;

      const ui: UiExpense = {
        id: editing.id,
        amount: +values.amount,
        category: values.category as ExpenseCategory,
        description: values.description,
        date: values.date,
        time: values.time,
        paymentMethod: values.paymentMethod || "CASH",
      };
      const updated = await ExpenseAPI.update(editing.id, toUpdate(ui));
      const afterUi = toUiSafe(updated);

      setEditDialogOpen(false);
      setEditing(null);

      // cập nhật trong bảng
      setItems(prev => prev.map(x => (x.id === afterUi.id ? afterUi : x)));

      // ✅ Điều chỉnh tổng chi tháng theo chênh lệch
      const inMonthBefore = isInSameMonth(before.date, new Date());
      const inMonthAfter = isInSameMonth(afterUi.date, new Date());
      if (inMonthBefore && inMonthAfter) {
        setMonthlySpent(prev => prev - before.amount + afterUi.amount);
      } else if (inMonthBefore && !inMonthAfter) {
        setMonthlySpent(prev => prev - before.amount);
      } else if (!inMonthBefore && inMonthAfter) {
        setMonthlySpent(prev => prev + afterUi.amount);
      }

      // ✅ cập nhật cache dashboard
      upsertDash(afterUi);

      // đồng bộ lại danh sách trang
      setQueryNonce(n => n + 1);
    } catch (e: any) {
      console.error("[Expenses] update failed:", e);
      alert(e?.message || "Cập nhật chi tiêu thất bại");
    }
  };

  const onDelete = async (it?: UiExpense) => {
    if (!it?.id) return;
    try {
      await ExpenseAPI.remove(it.id);

      // xoá tại chỗ
      setItems(prev => prev.filter(x => x.id !== it.id));

      // ✅ giảm tổng chi tháng nếu bản ghi thuộc tháng hiện tại
      if (isInSameMonth(it.date, new Date())) {
        setMonthlySpent(prev => Math.max(0, prev - it.amount));
      }

      // ✅ cập nhật cache dashboard
      removeFromDash(it);

      // đồng bộ lại với BE (không ảnh hưởng tổng chi vì ta đã cập nhật ngay)
      setQueryNonce(n => n + 1);
    } catch (e: any) {
      console.error("[Expenses] delete failed:", e);
      alert(e?.message || "Xóa chi tiêu thất bại");
    }
  };

  /* ---- computed (hiển thị) ---- */
  // Tổng chi dùng state monthlySpent (đúng toàn tháng, không lệ thuộc trang)
  const totalSpentThisMonth = monthlySpent;

  // Số dư = Ngân sách tháng – Tổng chi (tháng này)
  const balance = useMemo(
    () => monthlyBudget - totalSpentThisMonth,
    [monthlyBudget, totalSpentThisMonth]
  );

  // Biểu đồ: dùng dữ liệu đang hiển thị trong bảng (tránh gọi thêm nhiều request)
  const nowRef = new Date();
  const itemsThisMonth = useMemo(() => {
    return items.filter((it) => isInSameMonth(it.date, nowRef));
  }, [items]);

  const categorySpendingThisMonth: Record<string, number> = useMemo(() => {
    return itemsThisMonth.reduce((acc, curr) => {
      const key = curr.category || "OTHER";
      acc[key] = (acc[key] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [itemsThisMonth]);

  const chartCategories = useMemo(() => {
    if (totalSpentThisMonth === 0) return [];
    const colors = ["bg-primary","bg-green-600","bg-purple-500","bg-orange-500","bg-red-500"];
    return Object.entries(categorySpendingThisMonth)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount], index) => {
        const pct = Math.round((amount / totalSpentThisMonth) * 100);
        return { name, amount, color: colors[index % colors.length], percentage: pct };
      });
  }, [categorySpendingThisMonth, totalSpentThisMonth]);

  const budgetUsagePercentage = monthlyBudget > 0
    ? Math.round((totalSpentThisMonth / monthlyBudget) * 100)
    : 0;

  /* ===== UI ===== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý chi tiêu</h1>
            <p className="text-muted-foreground">Theo dõi chi và ngân sách của bạn</p>
          </div>
        </div>

        {/* Add dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Thêm chi tiêu</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Thêm chi tiêu mới</DialogTitle>
              <DialogDescription>Nhập số tiền, ngày giờ, danh mục và mô tả (tuỳ chọn).</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền (VND)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step={1000} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="date"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="time"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giờ</FormLabel>
                        <FormControl><Input type="time" step={60} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="paymentMethod"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phương thức</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phương thức" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentOptions.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả</FormLabel>
                      <FormControl><Input placeholder="Ghi chú (tuỳ chọn)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                  <Button type="submit">Lưu</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {errMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errMsg}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Tổng chi (tháng này) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi (tháng này)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{totalSpentThisMonth.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>

        {/* Số dư = Ngân sách tháng – Tổng chi (tháng này) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số dư</CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {balance.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>

        {/* Ngân sách tháng */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ngân sách tháng</CardTitle>
            <div className="flex items-center">
              <Target className="h-4 w-4 text-primary" />
              <Dialog open={editBudgetOpen} onOpenChange={setEditBudgetOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-2">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Chỉnh sửa ngân sách tháng</DialogTitle>
                    <DialogDescription>Đặt mục tiêu chi tiêu trong tháng của bạn.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Ngân sách (VND)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" type="button" onClick={() => setEditBudgetOpen(false)}>Hủy</Button>
                      <Button type="button" onClick={handleSaveBudget}>Lưu</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {monthlyBudget.toLocaleString("vi-VN")} ₫
            </div>
            <div className="mt-2 space-y-1">
              <Progress value={budgetUsagePercentage} className="h-2" />
              <div className={`text-xs flex items-center ${budgetUsagePercentage > 80 ? "text-red-600" : "text-muted-foreground"}`}>
                {budgetUsagePercentage > 100 && <AlertCircle className="h-3 w-3 mr-1" />}
                Đã dùng {budgetUsagePercentage}% ({totalSpentThisMonth.toLocaleString("vi-VN")} ₫)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phân tích chi tiêu (tháng này) */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader><CardTitle>Phân tích chi tiêu (tháng này)</CardTitle></CardHeader>
          <CardContent>
            {chartCategories.length > 0 ? (
              <div className="space-y-4">
                {chartCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium">{category.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${category.color} rounded-full`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.amount.toLocaleString("vi-VN")} ₫
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu chi tiêu trong tháng hiện tại.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Danh mục</Label>
              <Select value={fCategory} onValueChange={(v) => setFCategory(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Phương thức</Label>
              <Select value={fPayment} onValueChange={(v) => setFPayment(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {paymentOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Tìm kiếm</Label>
              <Input id="search" className="mt-1" placeholder="Nhập mô tả..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex items-end gap-2 mt-3">
            <Button onClick={() => { setPageIndex(0); setQueryNonce(n => n + 1); }}>Tìm</Button>
            <Button variant="outline" onClick={() => {
              setFCategory("ALL"); setFPayment("ALL"); setSearchQuery("");
              setFMin(""); setFMax(""); setFStart(""); setFEnd("");
              setPageIndex(0); setQueryNonce(n => n + 1);
            }}>
              Xóa lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Lịch sử giao dịch</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Giờ</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>PTTT</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? items.map((it) => (
                <TableRow key={it.id ?? `${it.date}-${it.time}-${it.amount}`}>
                  <TableCell>{new Date(`${it.date}T00:00:00`).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>{it.time}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={it.description ?? ""}>
                    {it.description || "-"}
                  </TableCell>
                  <TableCell><Badge variant="outline">{it.category}</Badge></TableCell>
                  <TableCell>{it.paymentMethod || "-"}</TableCell>
                  <TableCell className="text-right text-red-600">-{it.amount.toLocaleString("vi-VN")} ₫</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(it)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> Xóa</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa chi tiêu?</AlertDialogTitle>
                            <AlertDialogDescription>Thao tác này không thể hoàn tác.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(it)}>Xóa</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {loading ? "Đang tải..." : "Không có dữ liệu."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chi tiêu</DialogTitle>
            <DialogDescription>Cập nhật thông tin giao dịch và lưu thay đổi.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField name="amount" control={editForm.control} render={({ field }) => (
                <FormItem><FormLabel>Số tiền (VND)</FormLabel><FormControl><Input type="number" min="0" step={1000} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField name="date" control={editForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Ngày</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="time" control={editForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Giờ</FormLabel><FormControl><Input type="time" step={60} {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField name="category" control={editForm.control} render={({ field }) => (
                <FormItem><FormLabel>Danh mục</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField name="paymentMethod" control={editForm.control} render={({ field }) => (
                <FormItem><FormLabel>Phương thức</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {paymentOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField name="description" control={editForm.control} render={({ field }) => (
                <FormItem><FormLabel>Mô tả</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Hủy</Button>
                <Button type="submit">Lưu</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
