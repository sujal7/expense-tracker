import { format, subDays } from "date-fns";
import {
  generateId,
  formatCurrency,
  formatDate,
  getTotalSpending,
  getMonthlyTotal,
  getWeeklyTotal,
  getDailyAverage,
  getTotalByCategory,
  getTopCategory,
  getMonthlyData,
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/utils";
import { Expense } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeExpense(
  overrides: Partial<Expense> & { amount: number }
): Expense {
  return {
    id: generateId(),
    date: format(new Date(), "yyyy-MM-dd"),
    category: "Food",
    description: "Test expense",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

// ─── generateId ─────────────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats cents", () => {
    expect(formatCurrency(1.5)).toBe("$1.50");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a valid ISO date", () => {
    expect(formatDate("2026-03-30")).toBe("Mar 30, 2026");
  });

  it("formats January correctly", () => {
    expect(formatDate("2025-01-01")).toBe("Jan 1, 2025");
  });

  it("returns the input on invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

// ─── getTotalSpending ────────────────────────────────────────────────────────

describe("getTotalSpending", () => {
  it("returns 0 for empty array", () => {
    expect(getTotalSpending([])).toBe(0);
  });

  it("sums all expenses", () => {
    const expenses = [
      makeExpense({ amount: 10 }),
      makeExpense({ amount: 20.5 }),
      makeExpense({ amount: 5.25 }),
    ];
    expect(getTotalSpending(expenses)).toBeCloseTo(35.75);
  });
});

// ─── getMonthlyTotal ─────────────────────────────────────────────────────────

describe("getMonthlyTotal", () => {
  it("returns 0 for empty array", () => {
    expect(getMonthlyTotal([])).toBe(0);
  });

  it("counts only expenses from this month", () => {
    const thisMonth = makeExpense({ amount: 50, date: format(new Date(), "yyyy-MM-dd") });
    const lastMonth = makeExpense({ amount: 100, date: daysAgo(40) });
    expect(getMonthlyTotal([thisMonth, lastMonth])).toBeCloseTo(50);
  });

  it("includes expenses from earlier in the same month", () => {
    const today = makeExpense({ amount: 30, date: format(new Date(), "yyyy-MM-dd") });
    const earlyMonth = makeExpense({ amount: 20, date: format(new Date(), "yyyy-MM") + "-01" });
    expect(getMonthlyTotal([today, earlyMonth])).toBeCloseTo(50);
  });
});

// ─── getWeeklyTotal ──────────────────────────────────────────────────────────

describe("getWeeklyTotal", () => {
  it("returns 0 for empty array", () => {
    expect(getWeeklyTotal([])).toBe(0);
  });

  it("counts only expenses from this week", () => {
    const today = makeExpense({ amount: 25, date: format(new Date(), "yyyy-MM-dd") });
    const lastWeek = makeExpense({ amount: 100, date: daysAgo(8) });
    expect(getWeeklyTotal([today, lastWeek])).toBeCloseTo(25);
  });
});

// ─── getDailyAverage ─────────────────────────────────────────────────────────

describe("getDailyAverage", () => {
  it("returns 0 for empty array", () => {
    expect(getDailyAverage([])).toBe(0);
  });

  it("returns a positive number for expenses over time", () => {
    const expenses = [
      makeExpense({ amount: 100, date: daysAgo(10) }),
      makeExpense({ amount: 50, date: daysAgo(5) }),
    ];
    const avg = getDailyAverage(expenses);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThanOrEqual(150);
  });
});

// ─── getTotalByCategory ──────────────────────────────────────────────────────

describe("getTotalByCategory", () => {
  it("returns zero for all categories when no expenses", () => {
    const result = getTotalByCategory([]);
    CATEGORIES.forEach((cat) => expect(result[cat]).toBe(0));
  });

  it("groups amounts correctly by category", () => {
    const expenses = [
      makeExpense({ amount: 20, category: "Food" }),
      makeExpense({ amount: 30, category: "Food" }),
      makeExpense({ amount: 50, category: "Bills" }),
      makeExpense({ amount: 15, category: "Entertainment" }),
    ];
    const result = getTotalByCategory(expenses);
    expect(result.Food).toBeCloseTo(50);
    expect(result.Bills).toBeCloseTo(50);
    expect(result.Entertainment).toBeCloseTo(15);
    expect(result.Transportation).toBe(0);
  });
});

// ─── getTopCategory ──────────────────────────────────────────────────────────

describe("getTopCategory", () => {
  it("returns null for empty array", () => {
    expect(getTopCategory([])).toBeNull();
  });

  it("returns the highest-spending category", () => {
    const expenses = [
      makeExpense({ amount: 100, category: "Bills" }),
      makeExpense({ amount: 20, category: "Food" }),
      makeExpense({ amount: 80, category: "Shopping" }),
    ];
    const top = getTopCategory(expenses);
    expect(top).not.toBeNull();
    expect(top!.category).toBe("Bills");
    expect(top!.amount).toBeCloseTo(100);
  });
});

// ─── getMonthlyData ──────────────────────────────────────────────────────────

describe("getMonthlyData", () => {
  it("returns exactly numMonths entries", () => {
    const data = getMonthlyData([], 6);
    expect(data).toHaveLength(6);
  });

  it("returns months in chronological order", () => {
    const data = getMonthlyData([], 4);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].month >= data[i - 1].month).toBe(true);
    }
  });

  it("sums expenses into the correct month bucket", () => {
    const thisMonthKey = format(new Date(), "yyyy-MM");
    const expenses = [
      makeExpense({ amount: 40, date: `${thisMonthKey}-01` }),
      makeExpense({ amount: 60, date: `${thisMonthKey}-15` }),
    ];
    const data = getMonthlyData(expenses, 6);
    const thisMonth = data.find((d) => d.month === thisMonthKey);
    expect(thisMonth).toBeDefined();
    expect(thisMonth!.total).toBeCloseTo(100);
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

describe("CATEGORY_COLORS", () => {
  it("has an entry for every category", () => {
    CATEGORIES.forEach((cat) => {
      expect(CATEGORY_COLORS[cat]).toBeDefined();
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe("CATEGORY_ICONS", () => {
  it("has an emoji for every category", () => {
    CATEGORIES.forEach((cat) => {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
    });
  });
});
