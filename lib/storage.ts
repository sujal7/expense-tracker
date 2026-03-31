import { Expense } from "./types";

const STORAGE_KEY = "obsidian-ledger-expenses";

const VALID_CATEGORIES = new Set([
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
]);

function isValidExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    typeof e.amount === "number" &&
    !isNaN(e.amount) &&
    typeof e.category === "string" &&
    VALID_CATEGORIES.has(e.category) &&
    typeof e.description === "string" &&
    typeof e.createdAt === "string"
  );
}

export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidExpense);
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Expense, current: Expense[]): Expense[] {
  const updated = [expense, ...current];
  saveExpenses(updated);
  return updated;
}

export function updateExpense(expense: Expense, current: Expense[]): Expense[] {
  const updated = current.map((e) => (e.id === expense.id ? expense : e));
  saveExpenses(updated);
  return updated;
}

export function deleteExpense(id: string, current: Expense[]): Expense[] {
  const updated = current.filter((e) => e.id !== id);
  saveExpenses(updated);
  return updated;
}

export function hasSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("obsidian-ledger-seeded") === "true";
}

export function markSeeded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("obsidian-ledger-seeded", "true");
}
