import { Expense, Category } from "./types";
import {
  format,
  startOfMonth,
  startOfWeek,
  parseISO,
  subMonths,
  differenceInDays,
  eachMonthOfInterval,
} from "date-fns";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function getTotalSpending(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getMonthlyTotal(expenses: Expense[]): number {
  const start = startOfMonth(new Date());
  return expenses
    .filter((e) => {
      try {
        return parseISO(e.date) >= start;
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getWeeklyTotal(expenses: Expense[]): number {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return expenses
    .filter((e) => {
      try {
        return parseISO(e.date) >= start;
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getDailyAverage(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const dates = expenses.map((e) => parseISO(e.date)).sort((a, b) => a.getTime() - b.getTime());
  const span = Math.max(differenceInDays(new Date(), dates[0]), 1);
  return getTotalSpending(expenses) / span;
}

export function getTotalByCategory(expenses: Expense[]): Record<Category, number> {
  return CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    },
    {} as Record<Category, number>
  );
}

export function getTopCategory(expenses: Expense[]): {
  category: Category;
  amount: number;
} | null {
  const byCategory = getTotalByCategory(expenses);
  const entries = Object.entries(byCategory) as [Category, number][];
  const top = entries.reduce(
    (max, [cat, amt]) => (amt > max[1] ? [cat, amt] : max),
    ["Other" as Category, 0] as [Category, number]
  );
  if (top[1] === 0) return null;
  return { category: top[0], amount: top[1] };
}

export function getMonthlyData(
  expenses: Expense[],
  numMonths = 6
): { month: string; label: string; total: number }[] {
  const now = new Date();
  const start = subMonths(startOfMonth(now), numMonths - 1);

  const months = eachMonthOfInterval({ start, end: now });

  return months.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    const label = format(monthDate, "MMM");
    const total = expenses
      .filter((e) => e.date.startsWith(monthKey))
      .reduce((sum, e) => sum + e.amount, 0);
    return { month: monthKey, label, total };
  });
}

export function exportToCSV(expenses: Expense[]): void {
  const headers = ["Date", "Amount", "Category", "Description"];
  const rows = expenses.map((e) => [
    e.date,
    e.amount.toFixed(2),
    e.category,
    `"${e.description.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "#F0A500",
  Transportation: "#4B9EF0",
  Entertainment: "#A060F0",
  Shopping: "#F060A0",
  Bills: "#F04040",
  Other: "#60A0B0",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍽",
  Transportation: "🚗",
  Entertainment: "🎬",
  Shopping: "🛍",
  Bills: "📄",
  Other: "📦",
};

export const CATEGORIES: Category[] = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
];

export function getSeedExpenses(): Expense[] {
  const now = new Date();
  const seed = (daysAgo: number, amount: number, category: Category, description: string): Expense => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return {
      id: generateId(),
      date: format(date, "yyyy-MM-dd"),
      amount,
      category,
      description,
      createdAt: new Date(date).toISOString(),
    };
  };

  return [
    seed(0, 48.50, "Food", "Weekly groceries at Whole Foods"),
    seed(1, 14.20, "Transportation", "Uber to downtown"),
    seed(2, 120.00, "Bills", "Electric bill — March"),
    seed(3, 32.00, "Entertainment", "Netflix + Spotify subscriptions"),
    seed(4, 67.80, "Shopping", "New running shoes"),
    seed(5, 22.40, "Food", "Dinner at The Grill House"),
    seed(6, 9.50, "Transportation", "Metro card top-up"),
    seed(8, 250.00, "Bills", "Internet + phone plan"),
    seed(10, 45.00, "Food", "Meal prep groceries"),
    seed(12, 18.00, "Entertainment", "Movie tickets × 2"),
    seed(14, 89.99, "Shopping", "Amazon — home supplies"),
    seed(16, 36.00, "Food", "Brunch with friends"),
    seed(18, 12.50, "Transportation", "Parking fee"),
    seed(20, 200.00, "Bills", "Rent deposit transfer"),
    seed(22, 55.20, "Food", "Grocery run — Trader Joe's"),
    seed(24, 28.00, "Entertainment", "Concert tickets"),
    seed(26, 15.00, "Transportation", "Gas station"),
    seed(28, 74.50, "Shopping", "Clothing — H&M"),
    seed(30, 38.90, "Food", "Sushi dinner"),
    seed(32, 110.00, "Bills", "Health insurance co-pay"),
    seed(35, 29.00, "Entertainment", "Books — Amazon"),
    seed(38, 52.00, "Food", "Grocery run"),
    seed(40, 18.80, "Transportation", "Lyft rides"),
    seed(42, 340.00, "Bills", "Water + gas utilities"),
    seed(45, 95.00, "Shopping", "Birthday gift"),
    seed(48, 41.30, "Food", "Thai takeout + delivery"),
    seed(50, 16.00, "Entertainment", "Streaming service"),
    seed(55, 78.00, "Shopping", "Pharmacy essentials"),
    seed(60, 24.50, "Food", "Coffee + pastries"),
    seed(65, 130.00, "Bills", "Phone bill"),
  ];
}
