const HISTORY_KEY = "obsidian-ledger-export-history";

export interface ExportRecord {
  id: string;
  timestamp: string; // ISO string
  template: string;
  format: "csv" | "json" | "pdf";
  recordCount: number;
  destination: "local" | "email" | "sheets" | "dropbox" | "onedrive";
  filename: string;
}

export function getExportHistory(): ExportRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ExportRecord[]) : [];
  } catch {
    return [];
  }
}

export function addExportRecord(
  record: Omit<ExportRecord, "id">
): ExportRecord {
  const entry: ExportRecord = { ...record, id: Date.now().toString(36) };
  const history = [entry, ...getExportHistory()].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

export function clearExportHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
