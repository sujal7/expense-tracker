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
      (e) => `<tr>
        <td class="date">${e.date}</td>
        <td class="cat">${CATEGORY_ICONS[e.category]} ${e.category}</td>
        <td class="amt">$${e.amount.toFixed(2)}</td>
        <td class="desc">${escapeHtml(e.description)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Expense Report</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #f0f0f0; }
.title { font-size: 22px; font-weight: 700; } .meta { font-size: 11px; color: #888; margin-top: 3px; }
.badge { font-size: 11px; font-weight: 600; color: #c57b00; background: #fff8e6; border: 1px solid #f0d080; padding: 3px 10px; border-radius: 20px; }
.wrap { border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: #f8f8f8; }
th { padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #888; border-bottom: 2px solid #e8e8e8; }
td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; } tr:nth-child(even) { background: #fafafa; }
.date { font-family: monospace; color: #666; } .amt { font-family: monospace; font-weight: 600; color: #1a7a4a; text-align: right; }
th:nth-child(3) { text-align: right; } .desc { color: #444; }
.footer { display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding: 10px 12px; background: #f8f8f8; border-top: 2px solid #e8e8e8; }
.fl { font-size: 11px; color: #888; } .fv { font-size: 15px; font-weight: 700; font-family: monospace; }
@media print { body { padding: 20px; } }
</style></head><body>
<div class="header"><div><div class="title">Expense Report</div><div class="meta">${expenses.length} records · ${exportedAt}</div></div><div class="badge">LEDGER</div></div>
<div class="wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer"><span class="fl">Total</span><span class="fv">$${total.toFixed(2)}</span></div></div>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
}
