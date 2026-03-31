"use client";

import { useId } from "react";
import { Expense } from "@/lib/types";
import { getMonthlyData, formatCurrency } from "@/lib/utils";

interface SpendingChartProps {
  expenses: Expense[];
}

export default function SpendingChart({ expenses }: SpendingChartProps) {
  const uid = useId();
  const gradientId = `barGradient-${uid}`;
  const gradientDimId = `barGradientDim-${uid}`;
  const data = getMonthlyData(expenses, 6);
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  const chartHeight = 160;
  const barWidth = 40;
  const gap = 16;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3
            className="font-display text-xl font-medium"
            style={{ color: "var(--text)" }}
          >
            Monthly Spending
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Last 6 months
          </p>
        </div>
        <div
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            background: "rgba(240,165,0,0.08)",
            color: "var(--accent)",
            border: "1px solid rgba(240,165,0,0.15)",
          }}
        >
          {data.find((d) => d.total > 0) ? "Active" : "No data"}
        </div>
      </div>

      {data.every((d) => d.total === 0) ? (
        <div
          className="flex items-center justify-center h-40 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No expenses yet — add some to see your chart
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalWidth + 40 }}>
            {/* SVG Chart */}
            <svg
              width="100%"
              viewBox={`0 0 ${totalWidth + 10} ${chartHeight + 40}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0A500" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#F0A500" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id={gradientDimId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0A500" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F0A500" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Horizontal guide lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={chartHeight - chartHeight * ratio}
                  x2={totalWidth + 10}
                  y2={chartHeight - chartHeight * ratio}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Bars */}
              {data.map((d, i) => {
                const x = i * (barWidth + gap);
                const barH = Math.max((d.total / maxTotal) * chartHeight, d.total > 0 ? 4 : 0);
                const y = chartHeight - barH;
                const isMax = d.total === maxTotal && d.total > 0;

                return (
                  <g key={d.month}>
                    {/* Bar background */}
                    <rect
                      x={x}
                      y={0}
                      width={barWidth}
                      height={chartHeight}
                      rx="4"
                      fill="rgba(255,255,255,0.02)"
                    />

                    {/* Actual bar */}
                    {d.total > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        rx="4"
                        fill={isMax ? `url(#${gradientId})` : `url(#${gradientDimId})`}
                      >
                        <title>{formatCurrency(d.total)}</title>
                      </rect>
                    )}

                    {/* Amount label on top of bar */}
                    {d.total > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="9"
                        fill={isMax ? "#F0A500" : "rgba(255,255,255,0.3)"}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={isMax ? "600" : "400"}
                      >
                        ${Math.round(d.total)}
                      </text>
                    )}

                    {/* Month label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="rgba(255,255,255,0.35)"
                      fontFamily="Outfit, sans-serif"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
