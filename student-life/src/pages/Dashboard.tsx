// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, DollarSign, CheckCircle } from "lucide-react";
import {
  DASH_KEYS,
  loadExpenses,
  loadSchedule,
  loadTasks,
  type ExpenseLite,
  type Course,
  type Task,
} from "@/lib/dashboard-cache";

/* ------------ helpers ------------- */
const VN_CATEGORY: Record<string, string> = {
  FOOD: "Ăn uống",
  STUDY: "Học tập",
  TRANSPORT: "Di chuyển",
  OTHER: "Khác",
};

const WATCHED_KEYS: ReadonlyArray<string> = [
  DASH_KEYS.SCHEDULE,
  DASH_KEYS.TASKS,
  DASH_KEYS.EXPENSES,
  DASH_KEYS.BUDGET,
];

function toCurrency(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

function isSameMonth(dateStr: string, ref = new Date()) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}


function normalizeExpense(anyItem: any): ExpenseLite | null {
  if (!anyItem) return null;
  const rawAmount = anyItem.amount ?? anyItem.total ?? anyItem.value;
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return null;

  
  let date: string | undefined = anyItem.date;
  if (!date && typeof anyItem.expenseDate === "string") {
    date = anyItem.expenseDate.slice(0, 10);
  }
  if (!date) return null;

  const categoryRaw =
    anyItem.category ??
    anyItem.categoryName ??
    anyItem.type ??
    "OTHER";

  const normalized: ExpenseLite = {
    id: anyItem.id,
    amount,
    date,
    time: anyItem.time,
    category: String(categoryRaw).toUpperCase(),
    description: anyItem.description ?? null,
    paymentMethod: anyItem.paymentMethod ?? null,
  };
  return normalized;
}

/* ------------- component -------------- */
export const Dashboard = () => {
 
  const [todaySchedule, setTodaySchedule] = useState<Course[]>(() => loadSchedule());
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>(() => loadTasks());
  const [expensesCache, setExpensesCache] = useState<ExpenseLite[]>(() => {
    const raw = loadExpenses();
    return raw.map(normalizeExpense).filter(Boolean) as ExpenseLite[];
  });

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const raw = localStorage.getItem(DASH_KEYS.BUDGET);
    const num = raw ? Number(raw) : NaN;
    return Number.isFinite(num) && num >= 0 ? num : 5_000_000;
  });

  
  useEffect(() => {
    const reload = () => {
      setTodaySchedule(loadSchedule());
      setUpcomingTasks(loadTasks());
      const raw = loadExpenses();
      setExpensesCache(raw.map(normalizeExpense).filter(Boolean) as ExpenseLite[]);
      const b = localStorage.getItem(DASH_KEYS.BUDGET);
      const n = b ? Number(b) : NaN;
      setMonthlyBudget(Number.isFinite(n) && n >= 0 ? n : 5_000_000);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key && WATCHED_KEYS.includes(e.key)) reload();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("dashboard:schedule-cache", reload as EventListener);
    window.addEventListener("dashboard:tasks-cache", reload as EventListener);
    window.addEventListener("dashboard:expenses-cache", reload as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dashboard:schedule-cache", reload as EventListener);
      window.removeEventListener("dashboard:tasks-cache", reload as EventListener);
      window.removeEventListener("dashboard:expenses-cache", reload as EventListener);
    };
  }, []);

  
  const now = new Date();

  const scheduleTodaySorted = useMemo(
    () => [...todaySchedule].sort((a, b) => a.time.localeCompare(b.time)),
    [todaySchedule]
  );

  const tasksSorted = useMemo(
    () => [...upcomingTasks]
      .filter(t => !!t?.title && !!t?.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5),
    [upcomingTasks]
  );

  const expensesThisMonth = useMemo(
    () => expensesCache.filter((e) => e?.date && isSameMonth(e.date, now)),
    [expensesCache, now]
  );

  const monthlyExpenses = useMemo(
    () => (expensesThisMonth.length
      ? expensesThisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      : 0),
    [expensesThisMonth]
  );

  const topCategories = useMemo(() => {
    if (!expensesThisMonth.length) return [];
    const map: Record<string, number> = {};
    for (const e of expensesThisMonth) {
      const key = (e.category || "OTHER").toUpperCase();
      map[key] = (map[key] || 0) + (Number(e.amount) || 0);
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, value]) => ({ name: VN_CATEGORY[cat] || cat, value }));
  }, [expensesThisMonth]);

  /* -------------- UI --------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Lịch học hôm nay */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lịch học hôm nay</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {scheduleTodaySorted.length ? (
              <div className="space-y-3">
                {scheduleTodaySorted.map((s, i) => (
                  <div key={`${s.time}-${s.subject}-${i}`} className="flex items-center space-x-3 rounded-lg bg-muted/50 p-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{s.subject}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.time} • {s.room}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null }
          </CardContent>
        </Card>

        {/* Task sắp đến hạn */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task sắp đến hạn</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksSorted.length ? (
              <div className="space-y-3">
                {tasksSorted.map((task, i) => (
                  <div key={`${task.title}-${task.deadline}-${i}`} className="flex items-center space-x-3 rounded-lg bg-muted/50 p-3">
                    <div className={`h-2 w-2 rounded-full ${task.done ? "bg-green-600" : "bg-destructive"}`} />
                    <div className="flex-1">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(task.deadline).toLocaleDateString("vi-VN")} {task.subject ? `• ${task.subject}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null }
          </CardContent>
        </Card>

        {/* Chi tiêu tháng này */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chi tiêu tháng này</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            
            {expensesThisMonth.length ? (
              <>
                <div className="text-2xl font-bold text-primary">{toCurrency(monthlyExpenses)}</div>
                <div className="mt-4 space-y-2">
                  {topCategories.map((c) => (
                    <div key={c.name} className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-medium">{toCurrency(c.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Ngân sách tháng hiện tại: {toCurrency(monthlyBudget)}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
