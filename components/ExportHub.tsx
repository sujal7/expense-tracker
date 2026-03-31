"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfMonth, startOfYear, subMonths, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { Expense, Category } from "@/lib/types";
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { downloadCSV, downloadJSON, printAsPDF } from "@/lib/exportUtils";
import { getExportHistory, addExportRecord, clearExportHistory, ExportRecord } from "@/lib/exportHistory";
import { getSchedule, saveSchedule, ExportSchedule } from "@/lib/exportSchedule";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "templates" | "channels" | "schedule" | "history";
type ServiceId = "sheets" | "dropbox" | "onedrive";
type ServiceStatus = "idle" | "connecting" | "connected" | "syncing" | "synced";
type ExportFormat = "csv" | "json" | "pdf";

const CONNECTIONS_KEY = "obsidian-ledger-connections";

// ─── Templates ────────────────────────────────────────────────────────────────

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
      description: "Last 6 months grouped by category. Great for trend analysis.",
      icon: "📊",
      accentColor: "#a855f7",
      getExpenses: (all) => all.filter((e) => e.date >= sixMonthsAgo),
      defaultFormat: "json",
    },
  ];
}

// ─── Services ─────────────────────────────────────────────────────────────────

const SERVICES: { id: ServiceId; name: string; icon: string; color: string; tagline: string }[] = [
  { id: "sheets", name: "Google Sheets", icon: "🟢", color: "#0f9d58", tagline: "Live spreadsheet sync" },
  { id: "dropbox", name: "Dropbox", icon: "📦", color: "#0061ff", tagline: "Automatic file backup" },
  { id: "onedrive", name: "OneDrive", icon: "☁", color: "#0078d4", tagline: "Microsoft 365 integration" },
];

// ─── QR Code (visual mock) ────────────────────────────────────────────────────

function MockQRCode({ size = 120 }: { size?: number }) {
  // Finder pattern cells (top-left, top-right, bottom-left) + pseudo-random data cells
  const cells = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: 21 }, () => Array(21).fill(false));
    // Finder patterns
    const finder = (r: number, c: number) => {
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) {
          const onEdge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          grid[r + dr][c + dc] = onEdge || inInner;
        }
    };
    finder(0, 0); finder(0, 14); finder(14, 0);
    // Timing patterns
    for (let i = 8; i < 13; i++) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }
    // Pseudo-random data using a seeded pattern
    const seed = [
      [2,9],[3,11],[4,10],[5,12],[7,8],[8,9],[9,10],[10,11],[11,9],[12,8],
      [13,10],[14,11],[15,9],[16,8],[17,10],[18,9],[2,16],[3,18],[4,17],
      [5,19],[7,16],[8,18],[9,17],[10,19],[11,16],[12,18],[13,17],[15,16],
      [16,18],[17,17],[18,19],[8,11],[9,13],[10,12],[11,14],[12,11],[9,15],
    ];
    seed.forEach(([r, c]) => { if (r < 21 && c < 21) grid[r][c] = true; });
    return grid;
  }, []);

  const cell = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="white" rx="4" />
      {cells.map((row, r) =>
        row.map(
          (filled, c) =>
            filled && (
              <rect
                key={`${r}-${c}`}
                x={c * cell + 1}
                y={r * cell + 1}
                width={cell - 1}
                height={cell - 1}
                fill="#111"
                rx="0.5"
              />
            )
        )
      )}
    </svg>
  );
}

// ─── Relative time ─────────────────────────────────────────────────────────────

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

function nextRunLabel(schedule: ExportSchedule): string {
  if (!schedule.enabled) return "—";
  if (!schedule.lastRun) return "Soon";
  const last = new Date(schedule.lastRun);
  const intervals = { daily: 1, weekly: 7, monthly: 30 };
  const daysToAdd = intervals[schedule.frequency];
  const next = new Date(last);
  next.setDate(next.getDate() + daysToAdd);
  const daysLeft = differenceInDays(next, new Date());
  if (daysLeft <= 0) return "Overdue";
  if (daysLeft === 1) return "Tomorrow";
  return `In ${daysLeft} days`;
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ExportHubProps {
  expenses: Expense[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportHub({ expenses, isOpen, onClose }: ExportHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [templateFormats, setTemplateFormats] = useState<Record<string, ExportFormat>>({
    tax: "csv", monthly: "csv", analysis: "json",
  });
  const [exportingTemplate, setExportingTemplate] = useState<string | null>(null);

  // Channels state
  const [services, setServices] = useState<Record<ServiceId, ServiceStatus>>({
    sheets: "idle", dropbox: "idle", onedrive: "idle",
  });
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Schedule state
  const [schedule, setSchedule] = useState<ExportSchedule>(() => ({
    enabled: false, frequency: "weekly", format: "csv",
    destination: "local", emailTo: "", lastRun: null,
  }));

  // History state
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [redownloading, setRedownloading] = useState<string | null>(null);

  // Load persisted state
  useEffect(() => {
    if (!isOpen) return;
    setHistory(getExportHistory());
    setSchedule(getSchedule());
    try {
      const saved = JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || "{}") as Partial<Record<ServiceId, ServiceStatus>>;
      setServices((prev) => {
        const next = { ...prev };
        (Object.keys(saved) as ServiceId[]).forEach((id) => {
          if (saved[id] === "connected") next[id] = "connected";
        });
        return next;
      });
    } catch { /* ignore */ }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  const templates = useMemo(() => buildTemplates(expenses), [expenses]);

  // ── Template export ────────────────────────────────────────────────────────

  const handleTemplateExport = useCallback(
    async (tpl: Template) => {
      if (exportingTemplate) return;
      setExportingTemplate(tpl.id);
      await new Promise((r) => setTimeout(r, 900));

      const fmt = templateFormats[tpl.id] as ExportFormat;
      const filtered = tpl.getExpenses(expenses);
      const filename = `ledger-${tpl.id}-${format(new Date(), "yyyy-MM-dd")}`;

      if (fmt === "csv") downloadCSV(filtered, filename);
      else if (fmt === "json") downloadJSON(filtered, filename);
      else printAsPDF(filtered, filename);

      const record = addExportRecord({
        timestamp: new Date().toISOString(),
        template: tpl.name,
        format: fmt,
        recordCount: filtered.length,
        destination: "local",
        filename,
      });
      setHistory((prev) => [record, ...prev]);
      setExportingTemplate(null);
    },
    [exportingTemplate, templateFormats, expenses]
  );

  // ── Service connect/sync ───────────────────────────────────────────────────

  const handleConnect = useCallback(async (id: ServiceId) => {
    setServices((p) => ({ ...p, [id]: "connecting" }));
    await new Promise((r) => setTimeout(r, 1800));
    setServices((p) => ({ ...p, [id]: "connected" }));
    // persist
    try {
      const saved = JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || "{}");
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify({ ...saved, [id]: "connected" }));
    } catch { /* ignore */ }
  }, []);

  const handleDisconnect = useCallback((id: ServiceId) => {
    setServices((p) => ({ ...p, [id]: "idle" }));
    try {
      const saved = JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || "{}");
      delete saved[id];
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(saved));
    } catch { /* ignore */ }
  }, []);

  const handleSync = useCallback(async (id: ServiceId) => {
    setServices((p) => ({ ...p, [id]: "syncing" }));
    await new Promise((r) => setTimeout(r, 1400));
    setServices((p) => ({ ...p, [id]: "synced" }));
    const record = addExportRecord({
      timestamp: new Date().toISOString(),
      template: "Full Export",
      format: "csv",
      recordCount: expenses.length,
      destination: id,
      filename: `ledger-sync-${format(new Date(), "yyyy-MM-dd")}`,
    });
    setHistory((prev) => [record, ...prev]);
    setTimeout(() => setServices((p) => ({ ...p, [id]: "connected" })), 2000);
  }, [expenses.length]);

  const handleSendEmail = useCallback(async () => {
    if (!emailTo.trim() || emailSending) return;
    setEmailSending(true);
    await new Promise((r) => setTimeout(r, 1600));
    setEmailSending(false);
    setEmailSent(true);
    const record = addExportRecord({
      timestamp: new Date().toISOString(),
      template: "Full Export",
      format: "csv",
      recordCount: expenses.length,
      destination: "email",
      filename: `ledger-${format(new Date(), "yyyy-MM-dd")}`,
    });
    setHistory((prev) => [record, ...prev]);
    setTimeout(() => setEmailSent(false), 3000);
  }, [emailTo, emailSending, expenses.length]);

  const handleGenerateCode = useCallback(() => {
    const hex = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join("");
    setShareCode(`LDR-${hex}`);
    setCopied(false);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareCode]);

  // ── Schedule ───────────────────────────────────────────────────────────────

  const updateSchedule = useCallback((patch: Partial<ExportSchedule>) => {
    setSchedule((prev) => {
      const next = { ...prev, ...patch };
      saveSchedule(next);
      return next;
    });
  }, []);

  // ── History ────────────────────────────────────────────────────────────────

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

  const handleClearHistory = useCallback(() => {
    clearExportHistory();
    setHistory([]);
  }, []);

  if (!isOpen) return null;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "templates", label: "Templates" },
    { id: "channels", label: "Channels" },
    { id: "schedule", label: "Schedule" },
    { id: "history", label: "History", count: history.length || undefined },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Drawer */}
      <div
        className="h-full flex flex-col w-full sm:max-w-[520px]"
        style={{
          background: "#080c1a",
          backdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          animation: "slideInRight 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)", color: "var(--accent)" }}
            >
              ⬡
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text)" }}>
                Export Hub
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {expenses.length} records · {Object.values(services).filter((s) => s === "connected").length} service{Object.values(services).filter((s) => s === "connected").length !== 1 ? "s" : ""} connected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >✕</button>
        </div>

        {/* Tab bar */}
        <div
          className="flex items-center gap-1 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "rgba(240,165,0,0.1)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  border: active ? "1px solid rgba(240,165,0,0.2)" : "1px solid transparent",
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(240,165,0,0.15)", color: "var(--accent)", fontSize: "10px" }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── TEMPLATES ── */}
          {activeTab === "templates" && (
            <>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Pre-configured exports for common use cases. One click, ready to use.
              </p>
              {templates.map((tpl) => {
                const filtered = tpl.getExpenses(expenses);
                const isExporting = exportingTemplate === tpl.id;
                const fmt = templateFormats[tpl.id];
                return (
                  <div
                    key={tpl.id}
                    className="rounded-2xl p-4 space-y-4"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${tpl.accentColor}18`, border: `1px solid ${tpl.accentColor}30` }}
                        >
                          {tpl.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>{tpl.name}</div>
                          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{tpl.description}</div>
                        </div>
                      </div>
                      <div
                        className="text-xs font-mono px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ background: `${tpl.accentColor}15`, color: tpl.accentColor, border: `1px solid ${tpl.accentColor}25` }}
                      >
                        {filtered.length} rec
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(["csv", "json", "pdf"] as ExportFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setTemplateFormats((p) => ({ ...p, [tpl.id]: f }))}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all"
                          style={{
                            background: fmt === f ? "rgba(240,165,0,0.1)" : "rgba(255,255,255,0.04)",
                            border: fmt === f ? "1px solid rgba(240,165,0,0.25)" : "1px solid rgba(255,255,255,0.07)",
                            color: fmt === f ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >
                          .{f.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => handleTemplateExport(tpl)}
                        disabled={filtered.length === 0 || !!exportingTemplate}
                        className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: filtered.length === 0 ? "rgba(255,255,255,0.04)" : `${tpl.accentColor}18`,
                          border: filtered.length === 0 ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${tpl.accentColor}35`,
                          color: filtered.length === 0 ? "rgba(255,255,255,0.2)" : tpl.accentColor,
                          cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        {isExporting ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 animate-spin inline-block" style={{ borderColor: tpl.accentColor, borderTopColor: "transparent" }} />
                            Preparing…
                          </>
                        ) : (
                          `↓ Export`
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── CHANNELS ── */}
          {activeTab === "channels" && (
            <>
              {/* Email */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>✉</div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>Email Report</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Send a CSV export directly to any inbox</div>
                  </div>
                </div>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="accountant@example.com"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--text)" }}
                />
                <button
                  onClick={handleSendEmail}
                  disabled={!emailTo.trim() || emailSending}
                  className="w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: emailSent ? "rgba(0,200,140,0.12)" : emailTo.trim() ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.04)",
                    border: emailSent ? "1px solid rgba(0,200,140,0.3)" : emailTo.trim() ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    color: emailSent ? "var(--green)" : emailTo.trim() ? "#a78bfa" : "rgba(255,255,255,0.2)",
                    cursor: !emailTo.trim() || emailSending ? "not-allowed" : "pointer",
                  }}
                >
                  {emailSending ? (
                    <><span className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "#a78bfa", borderTopColor: "transparent" }} />Sending…</>
                  ) : emailSent ? (
                    <>✓ Sent!</>
                  ) : (
                    "Send Report"
                  )}
                </button>
              </div>

              {/* Cloud services */}
              {SERVICES.map((svc) => {
                const status = services[svc.id];
                const isConnecting = status === "connecting";
                const isConnected = status === "connected" || status === "syncing" || status === "synced";
                const isSyncing = status === "syncing";
                const isSynced = status === "synced";

                return (
                  <div key={svc.id} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: `${svc.color}15`, border: `1px solid ${svc.color}30` }}>
                          {svc.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{svc.name}</span>
                            {isConnected && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,200,140,0.1)", border: "1px solid rgba(0,200,140,0.2)", color: "var(--green)" }}>
                                {isSyncing ? "Syncing…" : isSynced ? "Synced ✓" : "Connected"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{svc.tagline}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isConnected && (
                          <>
                            <button
                              onClick={() => handleSync(svc.id)}
                              disabled={isSyncing}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ background: `${svc.color}15`, border: `1px solid ${svc.color}30`, color: svc.color }}
                            >
                              {isSyncing ? "…" : "Sync"}
                            </button>
                            <button
                              onClick={() => handleDisconnect(svc.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
                            >
                              Disconnect
                            </button>
                          </>
                        )}
                        {!isConnected && (
                          <button
                            onClick={() => handleConnect(svc.id)}
                            disabled={isConnecting}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: `${svc.color}15`, border: `1px solid ${svc.color}30`, color: svc.color, cursor: isConnecting ? "wait" : "pointer" }}
                          >
                            {isConnecting ? (
                              <><span className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: svc.color, borderTopColor: "transparent" }} />Connecting…</>
                            ) : "Connect"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Share code */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(240,165,0,0.05)", border: "1px solid rgba(240,165,0,0.14)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--accent)" }}>⟨/⟩</span>
                  <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>Share Code</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Generate a code your accountant or team can use to import this data.
                </p>
                {!shareCode ? (
                  <button
                    onClick={handleGenerateCode}
                    className="w-full py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.25)", color: "var(--accent)" }}
                  >
                    Generate Share Code
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div
                          className="font-mono text-lg font-bold tracking-widest px-4 py-3 rounded-xl text-center"
                          style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.2)", color: "var(--accent)" }}
                        >
                          {shareCode}
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: copied ? "rgba(0,200,140,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "rgba(0,200,140,0.25)" : "rgba(255,255,255,0.09)"}`, color: copied ? "var(--green)" : "var(--text-muted)" }}
                        >
                          {copied ? "✓ Copied!" : "Copy Code"}
                        </button>
                      </div>
                      <MockQRCode size={100} />
                    </div>
                    <button
                      onClick={() => setShareCode(null)}
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      Revoke &amp; generate new
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── SCHEDULE ── */}
          {activeTab === "schedule" && (
            <>
              {/* Enable toggle */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>Automatic Backups</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {schedule.enabled ? `Next run: ${nextRunLabel(schedule)}` : "Schedule recurring exports"}
                    </div>
                  </div>
                  <button
                    onClick={() => updateSchedule({ enabled: !schedule.enabled })}
                    className="w-12 h-6 rounded-full transition-all relative"
                    style={{ background: schedule.enabled ? "rgba(0,200,140,0.25)" : "rgba(255,255,255,0.08)", border: `1px solid ${schedule.enabled ? "rgba(0,200,140,0.4)" : "rgba(255,255,255,0.12)"}` }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                      style={{ background: schedule.enabled ? "var(--green)" : "rgba(255,255,255,0.3)", left: schedule.enabled ? "calc(100% - 22px)" : "2px" }}
                    />
                  </button>
                </div>
              </div>

              {schedule.enabled && (
                <>
                  {/* Frequency */}
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["daily", "weekly", "monthly"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => updateSchedule({ frequency: f })}
                          className="py-2.5 rounded-xl text-sm font-medium capitalize transition-all"
                          style={{
                            background: schedule.frequency === f ? "rgba(240,165,0,0.1)" : "rgba(255,255,255,0.03)",
                            border: schedule.frequency === f ? "1px solid rgba(240,165,0,0.28)" : "1px solid rgba(255,255,255,0.07)",
                            color: schedule.frequency === f ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >{f}</button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["csv", "json"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => updateSchedule({ format: f })}
                          className="py-2.5 rounded-xl text-sm font-mono font-medium transition-all"
                          style={{
                            background: schedule.format === f ? "rgba(240,165,0,0.1)" : "rgba(255,255,255,0.03)",
                            border: schedule.format === f ? "1px solid rgba(240,165,0,0.28)" : "1px solid rgba(255,255,255,0.07)",
                            color: schedule.format === f ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >.{f.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <div className="space-y-1.5">
                      {([
                        { id: "local" as const, label: "Local download", icon: "↓" },
                        { id: "email" as const, label: "Email", icon: "✉" },
                        { id: "sheets" as const, label: "Google Sheets", icon: "🟢", requiresConnection: true },
                      ]).map((d) => {
                        const disabled = d.requiresConnection && services.sheets !== "connected";
                        return (
                          <button
                            key={d.id}
                            onClick={() => !disabled && updateSchedule({ destination: d.id })}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                            style={{
                              background: schedule.destination === d.id ? "rgba(240,165,0,0.08)" : "rgba(255,255,255,0.03)",
                              border: schedule.destination === d.id ? "1px solid rgba(240,165,0,0.22)" : "1px solid rgba(255,255,255,0.06)",
                              color: disabled ? "rgba(255,255,255,0.2)" : schedule.destination === d.id ? "var(--accent)" : "var(--text-muted)",
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          >
                            <span>{d.icon}</span>
                            <span>{d.label}</span>
                            {disabled && <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Not connected</span>}
                            {schedule.destination === d.id && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>●</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {schedule.destination === "email" && (
                    <div className="space-y-2">
                      <Label>Send to</Label>
                      <input
                        type="email"
                        value={schedule.emailTo}
                        onChange={(e) => updateSchedule({ emailTo: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  <div
                    className="rounded-xl p-4"
                    style={{ background: "rgba(0,200,140,0.05)", border: "1px solid rgba(0,200,140,0.15)" }}
                  >
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--green)" }}>
                      <span>✓</span>
                      <span>
                        {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} backup active
                        {schedule.destination === "email" && schedule.emailTo ? ` · ${schedule.emailTo}` : ""}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Next run: {nextRunLabel(schedule)} · {expenses.length} records
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── HISTORY ── */}
          {activeTab === "history" && (
            <>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="text-4xl opacity-20">🕐</div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>No exports yet</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
                    Exports from Templates and Channels appear here
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {history.map((record) => {
                      const destColors: Record<string, string> = {
                        local: "rgba(255,255,255,0.15)",
                        email: "#a78bfa",
                        sheets: "#0f9d58",
                        dropbox: "#0061ff",
                        onedrive: "#0078d4",
                      };
                      const destColor = destColors[record.destination] || "rgba(255,255,255,0.15)";
                      const fmtIcon = record.format === "csv" ? "⬡" : record.format === "json" ? "{}" : "🖨";

                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <span className="text-sm font-mono w-5 text-center" style={{ color: "var(--text-muted)" }}>{fmtIcon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{record.template}</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: `${destColor}18`, border: `1px solid ${destColor}35`, color: destColor, fontSize: "10px" }}
                              >
                                {record.destination}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>.{record.format}</span>
                              <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{record.recordCount} records</span>
                              <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{relativeTime(record.timestamp)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRedownload(record)}
                            disabled={redownloading === record.id}
                            className="text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0 flex items-center gap-1"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
                          >
                            {redownloading === record.id
                              ? <span className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
                              : "↓"
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleClearHistory}
                    className="w-full py-2 rounded-xl text-xs font-medium mt-2"
                    style={{ background: "rgba(220,60,60,0.06)", border: "1px solid rgba(220,60,60,0.15)", color: "var(--red)" }}
                  >
                    Clear history
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}
