"use client";

import { Expense } from "@/lib/types";
import {
  formatCurrency,
  getTotalSpending,
  getMonthlyTotal,
  getWeeklyTotal,
  getDailyAverage,
  getTopCategory,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/utils";

interface SummaryCardsProps {
  expenses: Expense[];
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay?: number;
  icon?: string;
}

function StatCard({ label, value, sub, accent, delay = 0, icon }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: `slideUp 0.5s ease-out ${delay}ms both`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border =
          "1px solid rgba(255,255,255,0.1)";
        (e.currentTarget as HTMLDivElement).style.background = "#0c1120";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border =
          "1px solid rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card)";
      }}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
        style={{ background: accent || "var(--accent)", opacity: 0.6 }}
      />

      <div className="flex items-start justify-between">
        <span
          className="text-xs font-medium tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
        {icon && <span className="text-base opacity-60">{icon}</span>}
      </div>

      <div>
        <div
          className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight"
          style={{ color: accent || "var(--accent)" }}
        >
          {value}
        </div>
        {sub && (
          <div
            className="text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SummaryCards({ expenses }: SummaryCardsProps) {
  const total = getTotalSpending(expenses);
  const monthly = getMonthlyTotal(expenses);
  const weekly = getWeeklyTotal(expenses);
  const daily = getDailyAverage(expenses);
  const top = getTopCategory(expenses);

  const cards = [
    {
      label: "All Time",
      value: formatCurrency(total),
      sub: `across ${expenses.length} transactions`,
      accent: "var(--accent)",
      icon: "◈",
    },
    {
      label: "This Month",
      value: formatCurrency(monthly),
      sub: "current month spending",
      accent: "#4B9EF0",
      icon: "◉",
    },
    {
      label: "This Week",
      value: formatCurrency(weekly),
      sub: "since Monday",
      accent: "#A060F0",
      icon: "◎",
    },
    {
      label: "Daily Average",
      value: formatCurrency(daily),
      sub: top
        ? `top: ${CATEGORY_ICONS[top.category]} ${top.category}`
        : "per day",
      accent: top ? CATEGORY_COLORS[top.category] : "var(--green)",
      icon: "◇",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 60} />
      ))}
    </div>
  );
}
