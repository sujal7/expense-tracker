"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Expense, Category } from "@/lib/types";
import { CATEGORIES, CATEGORY_ICONS, formatCurrency } from "@/lib/utils";
import { downloadCSV, downloadJSON, printAsPDF } from "@/lib/exportUtils";
import {
  format,
  startOfYear,
  startOfMonth,
  subMonths,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import {
  getExportHistory,
  addExportRecord,
  clearExportHistory,
  ExportRecord,
} from "@/lib/exportHistory";

type ExportFormat = "csv" | "json" | "pdf";

const FORMAT_META: Record<ExportFormat, { label: string; hint: string; ext: string }> = {
  csv: { label: ".CSV", hint: "Spreadsheet", ext: "csv" },
  json: { label: ".JSON", hint: "Developer", ext: "json" },
  pdf: { label: ".PDF", hint: "Print / Save", ext: "pdf" },
};

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  getExpenses: (all: Expense[]) => Expense[];
  defaultFormat: ExportFormat;
}

function buildTemplates(expenses: Expense[]): Template[] {
  const now = new Date();
  const yearStart = format(startOfYear(now), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const sixMonthsAgo = format(subMonths(now, 6), "yyyy-MM-dd");

  return [
    {
      id: "tax",
      name: "Tax Report",
      description: "All expenses for the current year, sorted by date. Ready for your accountant.",
      icon: "📑",
      accentColor: "#22c55e",
      getExpenses: (all) =>
        [...all.filter((e) => e.date >= yearStart)].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      defaultFormat: "csv",
    },
    {
      id: "monthly",
      name: "Monthly Summary",
      description: "This month's spending at a glance. Perfect for budget reviews.",
      icon: "📅",
      accentColor: "#3b82f6",
      getExpenses: (all) => all.filter((e) => e.date >= monthStart),
      defaultFormat: "csv",
    },
    {
      id: "analysis",
      name: "Category Analysis",
      description: "Last 6 months of expenses. Great for trend analysis.",
      icon: "📊",
      accentColor: "#a855f7",
      getExpenses: (all) => all.filter((e) => e.date >= sixMonthsAgo),
      defaultFormat: "json",
    },
  ];
}

function relativeTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const mins = differenceInMinutes(now, d);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = differenceInHours(now, d);
  if (hrs < 24) return `${hrs}h ago`;
  const days = differenceInDays(now, d);
  return `${days}d ago`;
}

interface ExportModalProps {
  expenses: Expense[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ expenses, isOpen, onClose }: ExportModalProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  // ── Custom export state ──────────────────────────────────────────────────
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );
  const [filename, setFilename] = useState(`expenses-${today}`);
  const [isExporting, setIsExporting] = useState(false);

  // ── Quick templates state ────────────────────────────────────────────────
  const templates = useMemo(() => buildTemplates(expenses), [expenses]);
  const [templateFormats, setTemplateFormats] = useState<Record<string, ExportFormat>>({
    tax: "csv",
    monthly: "csv",
    analysis: "json",
  });
  const [exportingTemplate, setExportingTemplate] = useState<string | null>(null);

  // ── History state ────────────────────────────────────────────────────────
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [redownloading, setRedownloading] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Load history on open
  useEffect(() => {
    if (!isOpen) return;
    setHistory(getExportHistory());
  }, [isOpen]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      if (!selectedCategories.has(e.category)) return false;
      return true;
    });
  }, [expenses, startDate, endDate, selectedCategories]);

  const toggleCategory = useCallback((cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // ── Custom export ────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (filtered.length === 0 || isExporting) return;
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 750));
    const name = filename.trim() || `expenses-${today}`;
    if (exportFormat === "csv") downloadCSV(filtered, name);
    else if (exportFormat === "json") downloadJSON(filtered, name);
    else printAsPDF(filtered, name);
    const record = addExportRecord({
      timestamp: new Date().toISOString(),
      template: "Custom Export",
      format: exportFormat,
      recordCount: filtered.length,
      destination: "local",
      filename: name,
    });
    setHistory((prev) => [record, ...prev]);
    setIsExporting(false);
    if (exportFormat !== "pdf") onClose();
  }, [filtered, filename, exportFormat, isExporting, onClose, today]);

  // ── Template export ──────────────────────────────────────────────────────
  const handleTemplateExport = useCallback(
    async (tpl: Template) => {
      if (exportingTemplate) return;
      setExportingTemplate(tpl.id);
      await new Promise((r) => setTimeout(r, 750));
      const fmt = templateFormats[tpl.id] as ExportFormat;
      const tplExpenses = tpl.getExpenses(expenses);
      const name = `ledger-${tpl.id}-${today}`;
      if (fmt === "csv") downloadCSV(tplExpenses, name);
      else if (fmt === "json") downloadJSON(tplExpenses, name);
      else printAsPDF(tplExpenses, name);
      const record = addExportRecord({
        timestamp: new Date().toISOString(),
        template: tpl.name,
        format: fmt,
        recordCount: tplExpenses.length,
        destination: "local",
        filename: name,
      });
      setHistory((prev) => [record, ...prev]);
      setExportingTemplate(null);
      if (fmt !== "pdf") onClose();
    },
    [exportingTemplate, templateFormats, expenses, today, onClose]
  );

  // ── History actions ──────────────────────────────────────────────────────
  const handleClearHistory = useCallback(() => {
    clearExportHistory();
    setHistory([]);
  }, []);

  const handleRedownload = useCallback(
    async (record: ExportRecord) => {
      if (redownloading) return;
      setRedownloading(record.id);
      await new Promise((r) => setTimeout(r, 600));
      if (record.format === "csv") downloadCSV(expenses, record.filename);
      else if (record.format === "json") downloadJSON(expenses, record.filename);
      else printAsPDF(expenses, record.filename);
      setRedownloading(null);
    },
    [redownloading, expenses]
  );

  if (!isOpen) return null;

  const totalValue = filtered.reduce((sum, e) => sum + e.amount, 0);
  const previewRows = filtered.slice(0, 10);
  const overflow = filtered.length - previewRows.length;
  const allSelected = selectedCategories.size === CATEGORIES.length;
  const noneSelected = selectedCategories.size === 0;
  const dividerStyle = { borderColor: "rgba(255,255,255,0.06)" };

  const visibleHistory = history.slice(0, 5);
  const hiddenHistoryCount = history.length - visibleHistory.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "#080b16",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{
                background: "rgba(240,165,0,0.1)",
                border: "1px solid rgba(240,165,0,0.2)",
                color: "var(--accent)",
              }}
            >
              ↓
            </div>
            <div>
              <h2
                className="font-display text-lg font-semibold tracking-tight"
                style={{ color: "var(--text)" }}
              >
                Export Data
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {expenses.length} record{expenses.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Quick Export strip ── */}
          <div
            className="px-6 py-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Quick Export</SectionLabel>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                Pre-built · one click
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map((tpl) => {
                const tplExpenses = tpl.getExpenses(expenses);
                const fmt = templateFormats[tpl.id];
                const isExportingThis = exportingTemplate === tpl.id;
                const isDisabled = tplExpenses.length === 0 || !!exportingTemplate;
                return (
                  <div
                    key={tpl.id}
                    className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{
                            background: `${tpl.accentColor}18`,
                            border: `1px solid ${tpl.accentColor}30`,
                          }}
                        >
                          {tpl.icon}
                        </div>
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text)" }}
                        >
                          {tpl.name}
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: `${tpl.accentColor}15`,
                          border: `1px solid ${tpl.accentColor}25`,
                          color: tpl.accentColor,
                        }}
                      >
                        {tplExpenses.length}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className="text-xs leading-relaxed line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {tpl.description}
                    </p>

                    {/* Format toggles + export button */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      {(["csv", "json", "pdf"] as ExportFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() =>
                            setTemplateFormats((prev) => ({ ...prev, [tpl.id]: f }))
                          }
                          className="px-2 py-1 rounded-lg text-xs font-mono transition-all duration-150"
                          style={{
                            background:
                              fmt === f
                                ? "rgba(240,165,0,0.1)"
                                : "rgba(255,255,255,0.04)",
                            border:
                              fmt === f
                                ? "1px solid rgba(240,165,0,0.25)"
                                : "1px solid rgba(255,255,255,0.07)",
                            color:
                              fmt === f ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >
                          .{f.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => handleTemplateExport(tpl)}
                        disabled={isDisabled}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                        style={{
                          background: isDisabled
                            ? "rgba(255,255,255,0.04)"
                            : `${tpl.accentColor}18`,
                          border: isDisabled
                            ? "1px solid rgba(255,255,255,0.07)"
                            : `1px solid ${tpl.accentColor}35`,
                          color: isDisabled
                            ? "rgba(255,255,255,0.2)"
                            : tpl.accentColor,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {isExportingThis ? (
                          <>
                            <span
                              className="w-3 h-3 rounded-full border-2 animate-spin inline-block"
                              style={{
                                borderColor: tpl.accentColor,
                                borderTopColor: "transparent",
                              }}
                            />
                            <span>Preparing…</span>
                          </>
                        ) : (
                          "↓ Export"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 2-column grid (custom export + preview) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "400px" }}>

            {/* LEFT — Configuration */}
            <div
              className="p-6 space-y-7"
              style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Format */}
              <section>
                <SectionLabel>Format</SectionLabel>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(Object.keys(FORMAT_META) as ExportFormat[]).map((fmt) => {
                    const active = exportFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className="py-3 rounded-xl transition-all duration-200"
                        style={{
                          background: active
                            ? "rgba(240,165,0,0.1)"
                            : "rgba(255,255,255,0.03)",
                          border: active
                            ? "1px solid rgba(240,165,0,0.3)"
                            : "1px solid rgba(255,255,255,0.07)",
                          color: active ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        <div className="text-sm font-bold font-mono">
                          {FORMAT_META[fmt].label}
                        </div>
                        <div
                          className="text-xs mt-0.5 font-sans"
                          style={{
                            color: active
                              ? "rgba(240,165,0,0.55)"
                              : "rgba(255,255,255,0.2)",
                          }}
                        >
                          {FORMAT_META[fmt].hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Date range */}
              <section>
                <SectionLabel>Date Range</SectionLabel>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DateField
                    label="From"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="All time"
                  />
                  <DateField label="To" value={endDate} onChange={setEndDate} />
                </div>
              </section>

              {/* Categories */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionLabel>Categories</SectionLabel>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => setSelectedCategories(new Set(CATEGORIES))}
                      style={{
                        color: allSelected
                          ? "rgba(255,255,255,0.2)"
                          : "var(--accent)",
                      }}
                      disabled={allSelected}
                    >
                      All
                    </button>
                    <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
                    <button
                      onClick={() => setSelectedCategories(new Set())}
                      style={{
                        color: noneSelected
                          ? "rgba(255,255,255,0.2)"
                          : "var(--text-muted)",
                      }}
                      disabled={noneSelected}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {CATEGORIES.map((cat) => {
                    const checked = selectedCategories.has(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                        style={{
                          background: checked
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.02)",
                          border: checked
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid rgba(255,255,255,0.04)",
                          color: checked ? "var(--text)" : "var(--text-muted)",
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                          style={{
                            background: checked
                              ? "rgba(240,165,0,0.18)"
                              : "rgba(255,255,255,0.04)",
                            border: checked
                              ? "1px solid rgba(240,165,0,0.4)"
                              : "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {checked && (
                            <span
                              style={{
                                color: "var(--accent)",
                                fontSize: "9px",
                                fontWeight: 800,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </span>
                        <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                        <span className="text-xs font-medium">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Filename */}
              <section>
                <SectionLabel>Filename</SectionLabel>
                <div className="flex mt-3">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-l-xl text-sm font-mono outline-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRight: "none",
                      color: "var(--text)",
                    }}
                    placeholder={`expenses-${today}`}
                  />
                  <div
                    className="px-3 py-2.5 rounded-r-xl text-sm font-mono flex-shrink-0"
                    style={{
                      background: "rgba(240,165,0,0.07)",
                      border: "1px solid rgba(240,165,0,0.18)",
                      color: "rgba(240,165,0,0.7)",
                    }}
                  >
                    .{exportFormat}
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT — Preview + History */}
            <div className="p-6 flex flex-col gap-5">

              {/* Summary card */}
              <div
                className="rounded-xl p-4"
                style={{
                  background:
                    filtered.length > 0
                      ? "rgba(0,200,140,0.05)"
                      : "rgba(220,60,60,0.05)",
                  border: `1px solid ${
                    filtered.length > 0
                      ? "rgba(0,200,140,0.15)"
                      : "rgba(220,60,60,0.15)"
                  }`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="text-3xl font-display font-semibold"
                      style={{
                        color:
                          filtered.length > 0 ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {filtered.length}
                    </span>
                    <span
                      className="text-sm ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      record{filtered.length !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-base font-mono font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {formatCurrency(totalValue)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      total value
                    </div>
                  </div>
                </div>

                {/* Filter summary pills */}
                {(startDate || endDate !== today || !allSelected) && (
                  <div
                    className="flex flex-wrap gap-1.5 mt-3 pt-3"
                    style={dividerStyle as React.CSSProperties}
                  >
                    {startDate && <Pill>From {startDate}</Pill>}
                    {endDate && endDate !== today && <Pill>To {endDate}</Pill>}
                    {!allSelected && selectedCategories.size > 0 && (
                      <Pill>
                        {selectedCategories.size} categor
                        {selectedCategories.size === 1 ? "y" : "ies"}
                      </Pill>
                    )}
                    {noneSelected && <Pill warn>No categories</Pill>}
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="flex flex-col gap-2">
                <SectionLabel>
                  Preview
                  {filtered.length > 0 && (
                    <span
                      className="ml-2 font-sans normal-case tracking-normal font-normal"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      first {Math.min(10, filtered.length)} of {filtered.length}
                    </span>
                  )}
                </SectionLabel>

                {filtered.length === 0 ? (
                  <div
                    className="rounded-xl flex flex-col items-center justify-center py-10"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="text-4xl mb-3 opacity-30">∅</div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No records match your filters
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "rgba(255,255,255,0.18)" }}
                    >
                      Adjust the date range or select more categories
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <table className="w-full text-xs">
                      <thead>
                        <tr
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {["Date", "Cat", "Amount", "Description"].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                              style={{
                                color: "rgba(255,255,255,0.25)",
                                fontSize: "10px",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((e, i) => (
                          <tr
                            key={e.id}
                            style={{
                              borderBottom:
                                i < previewRows.length - 1
                                  ? "1px solid rgba(255,255,255,0.04)"
                                  : "none",
                              background:
                                i % 2 === 1
                                  ? "rgba(255,255,255,0.015)"
                                  : "transparent",
                            }}
                          >
                            <td
                              className="px-3 py-2 font-mono"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {e.date}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                              {CATEGORY_ICONS[e.category]}
                            </td>
                            <td
                              className="px-3 py-2 font-mono"
                              style={{ color: "var(--green)" }}
                            >
                              {formatCurrency(e.amount)}
                            </td>
                            <td
                              className="px-3 py-2 max-w-[120px] truncate"
                              style={{ color: "var(--text-muted)" }}
                              title={e.description}
                            >
                              {e.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {overflow > 0 && (
                      <div
                        className="px-3 py-2.5 text-xs text-center"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          color: "var(--text-muted)",
                        }}
                      >
                        ···&nbsp;&nbsp;{overflow} more record
                        {overflow !== 1 ? "s" : ""} not shown
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Recent Exports (history) ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Recent Exports</SectionLabel>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-xs transition-colors duration-150"
                      style={{ color: "rgba(220,60,60,0.6)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "rgba(220,60,60,0.9)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(220,60,60,0.6)";
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div
                    className="rounded-xl flex flex-col items-center justify-center py-6"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="text-2xl mb-1.5" style={{ opacity: 0.25 }}>
                      🕐
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      No exports yet
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {visibleHistory.map((record) => {
                      const fmtIcon =
                        record.format === "csv"
                          ? "⬡"
                          : record.format === "json"
                          ? "{}"
                          : "🖨";
                      const isRedownloading = redownloading === record.id;
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span
                            className="text-xs font-mono w-5 text-center flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {fmtIcon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-xs font-medium truncate"
                              style={{ color: "var(--text)" }}
                            >
                              {record.template}
                            </div>
                            <div
                              className="text-xs mt-0.5 font-mono"
                              style={{ color: "rgba(255,255,255,0.25)" }}
                            >
                              .{record.format} · {record.recordCount} rec ·{" "}
                              {relativeTime(record.timestamp)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRedownload(record)}
                            disabled={!!redownloading}
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "var(--text-muted)",
                              cursor: redownloading ? "not-allowed" : "pointer",
                            }}
                            title="Re-download (uses current data)"
                            onMouseEnter={(e) => {
                              if (!redownloading) {
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.09)";
                                e.currentTarget.style.color = "var(--text)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            {isRedownloading ? (
                              <span
                                className="w-3 h-3 rounded-full border-2 animate-spin"
                                style={{
                                  borderColor: "var(--text-muted)",
                                  borderTopColor: "transparent",
                                }}
                              />
                            ) : (
                              <span className="text-xs">↓</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {hiddenHistoryCount > 0 && (
                      <div
                        className="text-center text-xs py-1.5"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        +{hiddenHistoryCount} older export
                        {hiddenHistoryCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-6 py-4 gap-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-xs hidden sm:block"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {exportFormat === "pdf"
              ? "Opens a print dialog — choose 'Save as PDF'"
              : `Downloads as ${filename.trim() || `expenses-${today}`}.${exportFormat}`}
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={filtered.length === 0 || isExporting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  filtered.length === 0
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(240,165,0,0.14)",
                border:
                  filtered.length === 0
                    ? "1px solid rgba(255,255,255,0.07)"
                    : "1px solid rgba(240,165,0,0.32)",
                color:
                  filtered.length === 0
                    ? "rgba(255,255,255,0.2)"
                    : "var(--accent)",
                cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                opacity: isExporting ? 0.8 : 1,
              }}
            >
              {isExporting ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 animate-spin inline-block"
                    style={{
                      borderColor: "var(--accent)",
                      borderTopColor: "transparent",
                    }}
                  />
                  Preparing…
                </>
              ) : (
                <>
                  {exportFormat === "pdf" ? "🖨" : "↓"}&nbsp;Export{" "}
                  {filtered.length > 0 && (
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(240,165,0,0.15)" }}
                    >
                      {filtered.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small helper components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-widest"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
        {label}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: value ? "var(--text)" : "rgba(255,255,255,0.2)",
          colorScheme: "dark",
        }}
      />
    </div>
  );
}

function Pill({
  children,
  warn,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: warn ? "rgba(220,60,60,0.1)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${warn ? "rgba(220,60,60,0.2)" : "rgba(255,255,255,0.1)"}`,
        color: warn ? "var(--red)" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
