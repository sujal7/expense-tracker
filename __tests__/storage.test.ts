/**
 * Storage tests run in a jsdom environment where localStorage is available.
 * We reset localStorage before each test to ensure isolation.
 */

import { format } from "date-fns";
import {
  getExpenses,
  saveExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  hasSeeded,
  markSeeded,
} from "@/lib/storage";
import { Expense } from "@/lib/types";

function makeExpense(id: string, amount: number): Expense {
  return {
    id,
    date: format(new Date(), "yyyy-MM-dd"),
    amount,
    category: "Food",
    description: `Expense ${id}`,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ─── getExpenses ─────────────────────────────────────────────────────────────

describe("getExpenses", () => {
  it("returns empty array when storage is empty", () => {
    expect(getExpenses()).toEqual([]);
  });

  it("returns parsed expenses from storage", () => {
    const e = makeExpense("1", 50);
    localStorage.setItem("obsidian-ledger-expenses", JSON.stringify([e]));
    expect(getExpenses()).toEqual([e]);
  });

  it("returns empty array on corrupted storage", () => {
    localStorage.setItem("obsidian-ledger-expenses", "not-json{{{");
    expect(getExpenses()).toEqual([]);
  });
});

// ─── saveExpenses ────────────────────────────────────────────────────────────

describe("saveExpenses", () => {
  it("persists expenses to localStorage", () => {
    const expenses = [makeExpense("1", 10), makeExpense("2", 20)];
    saveExpenses(expenses);
    const stored = JSON.parse(
      localStorage.getItem("obsidian-ledger-expenses") ?? "[]"
    );
    expect(stored).toEqual(expenses);
  });

  it("overwrites previous data", () => {
    saveExpenses([makeExpense("old", 999)]);
    saveExpenses([makeExpense("new", 1)]);
    expect(getExpenses()).toHaveLength(1);
    expect(getExpenses()[0].id).toBe("new");
  });
});

// ─── addExpense ──────────────────────────────────────────────────────────────

describe("addExpense", () => {
  it("prepends new expense to the list", () => {
    const existing = [makeExpense("a", 10)];
    const newExp = makeExpense("b", 20);
    const result = addExpense(newExp, existing);
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
    expect(result).toHaveLength(2);
  });

  it("persists the updated list", () => {
    const newExp = makeExpense("x", 5);
    addExpense(newExp, []);
    expect(getExpenses()).toHaveLength(1);
  });
});

// ─── updateExpense ───────────────────────────────────────────────────────────

describe("updateExpense", () => {
  it("replaces the matching expense by id", () => {
    const original = makeExpense("1", 10);
    const updated = { ...original, amount: 99, description: "Updated" };
    const result = updateExpense(updated, [original]);
    expect(result[0].amount).toBe(99);
    expect(result[0].description).toBe("Updated");
  });

  it("does not change other expenses", () => {
    const a = makeExpense("a", 10);
    const b = makeExpense("b", 20);
    const updatedA = { ...a, amount: 50 };
    const result = updateExpense(updatedA, [a, b]);
    expect(result.find((e) => e.id === "b")?.amount).toBe(20);
  });

  it("preserves list length", () => {
    const expenses = [makeExpense("1", 1), makeExpense("2", 2)];
    const result = updateExpense({ ...expenses[0], amount: 99 }, expenses);
    expect(result).toHaveLength(2);
  });
});

// ─── deleteExpense ───────────────────────────────────────────────────────────

describe("deleteExpense", () => {
  it("removes the expense with the given id", () => {
    const expenses = [makeExpense("a", 10), makeExpense("b", 20)];
    const result = deleteExpense("a", expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns unchanged list for unknown id", () => {
    const expenses = [makeExpense("a", 10)];
    const result = deleteExpense("unknown", expenses);
    expect(result).toHaveLength(1);
  });

  it("persists the removal", () => {
    const expenses = [makeExpense("a", 10)];
    deleteExpense("a", expenses);
    expect(getExpenses()).toHaveLength(0);
  });
});

// ─── hasSeeded / markSeeded ──────────────────────────────────────────────────

describe("hasSeeded / markSeeded", () => {
  it("returns false before seeding", () => {
    expect(hasSeeded()).toBe(false);
  });

  it("returns true after markSeeded", () => {
    markSeeded();
    expect(hasSeeded()).toBe(true);
  });
});
