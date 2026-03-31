const SCHEDULE_KEY = "obsidian-ledger-export-schedule";

export interface ExportSchedule {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "json";
  destination: "local" | "email" | "sheets";
  emailTo: string;
  lastRun: string | null; // ISO string
}

const DEFAULTS: ExportSchedule = {
  enabled: false,
  frequency: "weekly",
  format: "csv",
  destination: "local",
  emailTo: "",
  lastRun: null,
};

export function getSchedule(): ExportSchedule {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ExportSchedule>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSchedule(schedule: ExportSchedule): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}
