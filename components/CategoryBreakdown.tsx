"use client";

import { Expense, Category } from "@/lib/types";
import {
  getTotalByCategory,
  getTotalSpending,
  formatCurrency,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORIES,
} from "@/lib/utils";

interface CategoryBreakdownProps {
  expenses: Expense[];
}

export default function CategoryBreakdown({ expenses }: CategoryBreakdownProps) {
  const byCategory = getTotalByCategory(expenses);
  const total = getTotalSpending(expenses);

  const sorted = CATEGORIES.map((cat) => ({
    category: cat,
    amount: byCategory[cat],
    pct: total > 0 ? (byCategory[cat] / total) * 100 : 0,
  }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mb-6">
        <h3
          className="font-display text-xl font-medium"
          style={{ color: "var(--text)" }}
        >
          By Category
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          All time breakdown
        </p>
      </div>

      {sorted.length === 0 ? (
        <div
          className="flex items-center justify-center h-40 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No data yet
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item, i) => (
            <div
              key={item.category}
              className="group"
              style={{ animation: `slideUp 0.4s ease-out ${i * 60}ms both` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_ICONS[item.category]}</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.pct.toFixed(1)}%
                  </span>
                  <span
                    className="font-mono text-sm font-medium tabular-nums"
                    style={{ color: CATEGORY_COLORS[item.category] }}
                  >
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${item.pct}%`,
                    background: CATEGORY_COLORS[item.category],
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Total row */}
          <div
            className="pt-3 mt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Total
            </span>
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
