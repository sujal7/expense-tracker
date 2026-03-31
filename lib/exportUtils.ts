import { Expense } from "./types";
import { CATEGORY_ICONS } from "./utils";

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadCSV(expenses: Expense[], filename: string): void {
  const headers = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.amount.toFixed(2),
    `"${e.description.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerDownload(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function downloadJSON(expenses: Expense[], filename: string): void {
  const data = expenses.map((e) => ({
    date: e.date,
    category: e.category,
    amount: e.amount,
    description: e.description,
  }));
  triggerDownload(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
}

export function printAsPDF(expenses: Expense[], _filename: string): void {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const exportedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = expenses
    .map(
      (e) => `
      <tr>
        <td class="date">${e.date}</td>
        <td class="category">${CATEGORY_ICONS[e.category]} ${e.category}</td>
        <td class="amount">$${e.amount.toFixed(2)}</td>
        <td class="desc">${escapeHtml(e.description)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Expense Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
    .title { font-size: 24px; font-weight: 700; color: #111; letter-spacing: -0.5px; }
    .meta { font-size: 12px; color: #888; margin-top: 4px; }
    .badge { font-size: 12px; font-weight: 600; color: #c57b00; background: #fff8e6; border: 1px solid #f0d080; padding: 4px 10px; border-radius: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8f8f8; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; border-bottom: 2px solid #e8e8e8; }
    td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #fafafa; }
    .date { font-family: monospace; font-size: 12px; color: #666; white-space: nowrap; }
    .amount { font-family: monospace; font-weight: 600; color: #1a7a4a; text-align: right; white-space: nowrap; }
    th:nth-child(3), td.amount { text-align: right; }
    .desc { color: #444; }
    .footer { margin-top: 0; padding: 12px 14px; display: flex; justify-content: flex-end; align-items: center; gap: 16px; background: #f8f8f8; border-top: 2px solid #e8e8e8; border-radius: 0 0 6px 6px; }
    .footer-label { font-size: 12px; color: #888; }
    .footer-total { font-size: 16px; font-weight: 700; font-family: monospace; color: #111; }
    .table-wrap { border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Expense Report</div>
      <div class="meta">${expenses.length} record${expenses.length !== 1 ? "s" : ""} · Exported ${exportedAt}</div>
    </div>
    <div class="badge">LEDGER</div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <span class="footer-label">Total</span>
      <span class="footer-total">$${total.toFixed(2)}</span>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
}
