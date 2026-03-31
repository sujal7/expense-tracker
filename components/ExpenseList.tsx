"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Expense, Category, FilterState, SortField, SortOrder } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORIES,
  exportToCSV,
} from "@/lib/utils";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseList({
  expenses,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: "All",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    if (filters.category !== "All") {
      result = result.filter((e) => e.category === filters.category);
    }

    if (filters.dateFrom) {
      result = result.filter((e) => e.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((e) => e.date <= filters.dateTo);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.date.localeCompare(b.date);
      if (sortField === "amount") cmp = a.amount - b.amount;
      if (sortField === "category") cmp = a.category.localeCompare(b.category);
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return result;
  }, [expenses, filters, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
  const hasActiveFilters =
    filters.category !== "All" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    } else {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setDeleteConfirm(id);
      deleteTimerRef.current = setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <span style={{ color: "var(--text-faint)", fontSize: 10 }}>↕</span>;
    return (
      <span style={{ color: "var(--accent)", fontSize: 10 }}>
        {sortOrder === "desc" ? "↓" : "↑"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-8 pr-4 py-2.5 rounded-lg text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{
              background: showFilters
                ? "rgba(240,165,0,0.1)"
                : "rgba(255,255,255,0.03)",
              border: showFilters
                ? "1px solid rgba(240,165,0,0.2)"
                : "1px solid rgba(255,255,255,0.07)",
              color: showFilters ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            ⊟ Filters
            {hasActiveFilters && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>

          {/* Export */}
          <button
            onClick={() => exportToCSV(filtered)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.03)";
            }}
            title="Export to CSV"
          >
            ↓ CSV
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div
            className="mt-4 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Category filter */}
            <div>
              <label
                className="block text-xs mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: e.target.value as Category | "All",
                  }))
                }
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--text)",
                }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c]} {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label
                className="block text-xs mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Date to */}
            <div>
              <label
                className="block text-xs mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={() =>
                    setFilters({
                      category: "All",
                      dateFrom: "",
                      dateTo: "",
                      search: "",
                    })
                  }
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: "var(--red)",
                    background: "rgba(232,64,64,0.08)",
                    border: "1px solid rgba(232,64,64,0.15)",
                  }}
                >
                  ✕ Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.length} of {expenses.length} records
          {hasActiveFilters && " (filtered)"}
        </span>
        {filtered.length > 0 && (
          <span
            className="text-xs font-mono"
            style={{ color: "var(--accent)" }}
          >
            Total: {formatCurrency(filteredTotal)}
          </span>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl py-16 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            No expenses found
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Add your first expense to get started"}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {/* Date */}
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)", width: "140px", minWidth: "140px" }}
                  >
                    <button
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      onClick={() => toggleSort("date")}
                    >
                      Date <SortIcon field="date" />
                    </button>
                  </th>

                  {/* Category */}
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)", width: "155px", minWidth: "155px" }}
                  >
                    <button
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      onClick={() => toggleSort("category")}
                    >
                      Category <SortIcon field="category" />
                    </button>
                  </th>

                  {/* Description */}
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Description
                  </th>

                  {/* Amount */}
                  <th
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)", width: "130px", minWidth: "130px" }}
                  >
                    <button
                      className="flex items-center justify-end gap-1.5 w-full hover:opacity-80 transition-opacity"
                      onClick={() => toggleSort("amount")}
                    >
                      Amount <SortIcon field="amount" />
                    </button>
                  </th>

                  {/* Actions */}
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)", width: "168px", minWidth: "168px" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((expense, i) => (
                  <tr
                    key={expense.id}
                    className="group transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      animation: `fadeIn 0.3s ease-out ${Math.min(i * 30, 300)}ms both`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "rgba(255,255,255,0.018)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent";
                    }}
                  >
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="text-sm font-mono tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(expense.date)}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                        style={{
                          color: CATEGORY_COLORS[expense.category],
                          background: `${CATEGORY_COLORS[expense.category]}15`,
                          border: `1px solid ${CATEGORY_COLORS[expense.category]}25`,
                        }}
                      >
                        <span>{CATEGORY_ICONS[expense.category]}</span>
                        <span>{expense.category}</span>
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-4 max-w-0">
                      <span
                        className="text-sm block truncate"
                        style={{ color: "var(--text)" }}
                        title={expense.description}
                      >
                        {expense.description}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <span
                        className="font-mono text-sm font-semibold tabular-nums"
                        style={{ color: "var(--accent)" }}
                      >
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(expense)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            color: "var(--text-muted)",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "var(--text)";
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "rgba(255,255,255,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "var(--text-muted)";
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "rgba(255,255,255,0.04)";
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            color:
                              deleteConfirm === expense.id
                                ? "var(--red)"
                                : "var(--text-muted)",
                            background:
                              deleteConfirm === expense.id
                                ? "rgba(232,64,64,0.12)"
                                : "rgba(255,255,255,0.04)",
                            border:
                              deleteConfirm === expense.id
                                ? "1px solid rgba(232,64,64,0.25)"
                                : "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {deleteConfirm === expense.id ? "Confirm?" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
