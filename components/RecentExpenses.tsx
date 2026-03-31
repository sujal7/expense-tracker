"use client";

import { Expense } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/utils";

interface RecentExpensesProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onViewAll: () => void;
}

export default function RecentExpenses({
  expenses,
  onEdit,
  onDelete,
  onViewAll,
}: RecentExpensesProps) {
  const recent = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <h3
            className="font-display text-xl font-medium"
            style={{ color: "var(--text)" }}
          >
            Recent Transactions
          </h3>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: "var(--accent)",
            background: "rgba(240,165,0,0.08)",
            border: "1px solid rgba(240,165,0,0.15)",
          }}
        >
          View all →
        </button>
      </div>

      {recent.length === 0 ? (
        <div
          className="px-6 py-12 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No transactions yet
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          {recent.map((expense, i) => (
            <div
              key={expense.id}
              className="px-6 py-4 flex items-center gap-4 group transition-colors"
              style={{ animation: `slideUp 0.4s ease-out ${i * 50}ms both` }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "transparent";
              }}
            >
              {/* Category icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: `${CATEGORY_COLORS[expense.category]}15`,
                  border: `1px solid ${CATEGORY_COLORS[expense.category]}25`,
                }}
              >
                {CATEGORY_ICONS[expense.category]}
              </div>

              {/* Description & category */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text)" }}
                >
                  {expense.description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-xs"
                    style={{ color: CATEGORY_COLORS[expense.category] }}
                  >
                    {expense.category}
                  </span>
                  <span style={{ color: "var(--text-faint)" }}>·</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDate(expense.date)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div
                className="font-mono text-base font-semibold tabular-nums flex-shrink-0"
                style={{ color: "var(--accent)" }}
              >
                {formatCurrency(expense.amount)}
              </div>

              {/* Actions (shown on hover and focus) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(expense)}
                  className="p-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text-muted)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="p-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--red)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(232,64,64,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text-muted)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
