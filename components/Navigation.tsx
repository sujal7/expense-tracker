"use client";

import { ActiveView } from "@/lib/types";

interface NavigationProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  expenseCount: number;
  onOpenExport: () => void;
}

export default function Navigation({
  activeView,
  onNavigate,
  expenseCount,
  onOpenExport,
}: NavigationProps) {
  const navItems: { view: ActiveView; label: string }[] = [
    { view: "dashboard", label: "Overview" },
    { view: "expenses", label: "Expenses" },
    { view: "add", label: "Add New" },
  ];

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(5,7,15,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 group"
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold"
              style={{
                background: "rgba(240,165,0,0.12)",
                border: "1px solid rgba(240,165,0,0.25)",
                color: "var(--accent)",
              }}
            >
              L
            </div>
            <span
              className="font-display text-xl tracking-[0.15em] font-semibold hidden sm:block"
              style={{ color: "var(--text)" }}
            >
              LEDGER
            </span>
          </button>

          {/* Nav Items */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ view, label }) => {
              const isActive =
                activeView === view ||
                (view === "expenses" && activeView === "edit");
              return (
                <button
                  key={view}
                  onClick={() => onNavigate(view)}
                  className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    background: isActive
                      ? "rgba(240,165,0,0.08)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(240,165,0,0.15)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--text)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {label}
                  {view === "add" && (
                    <span
                      className="ml-1.5 hidden sm:inline-flex items-center justify-center w-4 h-4 text-xs rounded"
                      style={{
                        background: "var(--accent)",
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      +
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: "rgba(240,165,0,0.07)",
                border: "1px solid rgba(240,165,0,0.18)",
                color: "rgba(240,165,0,0.8)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(240,165,0,0.14)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.borderColor = "rgba(240,165,0,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(240,165,0,0.07)";
                e.currentTarget.style.color = "rgba(240,165,0,0.8)";
                e.currentTarget.style.borderColor = "rgba(240,165,0,0.18)";
              }}
            >
              ↓ Export
            </button>
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              {expenseCount} records
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
