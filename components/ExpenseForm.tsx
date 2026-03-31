"use client";

import { useState } from "react";
import { Expense, Category } from "@/lib/types";
import {
  generateId,
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/utils";
import { format } from "date-fns";

interface ExpenseFormProps {
  initialExpense?: Expense;
  onSubmit: (expense: Expense) => void;
  onCancel: () => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export default function ExpenseForm({
  initialExpense,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [date, setDate] = useState(
    initialExpense?.date || format(new Date(), "yyyy-MM-dd")
  );
  const [amount, setAmount] = useState(
    initialExpense ? initialExpense.amount.toFixed(2) : ""
  );
  const [category, setCategory] = useState<Category>(
    initialExpense?.category || "Food"
  );
  const [description, setDescription] = useState(
    initialExpense?.description || ""
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      errs.amount = "Enter a valid amount greater than $0";
    } else if (parsed > 1_000_000) {
      errs.amount = "Amount seems too large";
    }
    if (!description.trim()) {
      errs.description = "Description is required";
    } else if (description.trim().length > 100) {
      errs.description = "Keep it under 100 characters";
    }
    if (!date) {
      errs.date = "Date is required";
    } else if (date > format(new Date(), "yyyy-MM-dd")) {
      errs.date = "Date cannot be in the future";
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ amount: true, description: true, date: true });
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const expense: Expense = {
      id: initialExpense?.id || generateId(),
      date,
      amount: Math.round(parseFloat(amount) * 100) / 100,
      category,
      description: description.trim(),
      createdAt: initialExpense?.createdAt || new Date().toISOString(),
    };

    onSubmit(expense);
  };

  const handleAmountChange = (val: string) => {
    // Allow only valid currency input
    const cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
    if (touched.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl text-sm transition-all duration-200";
  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--text)",
  };
  const errorStyle = {
    background: "rgba(232,64,64,0.05)",
    border: "1px solid rgba(232,64,64,0.25)",
    color: "var(--text)",
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Form header accent */}
          <div
            className="h-1"
            style={{
              background:
                "linear-gradient(90deg, var(--accent), transparent)",
            }}
          />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Amount — prominent field */}
            <div>
              <label
                htmlFor="expense-amount"
                className="block text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Amount
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, amount: true }))
                  }
                  id="expense-amount"
                  className="w-full pl-10 pr-4 py-4 rounded-xl font-mono text-2xl font-semibold transition-all"
                  style={
                    errors.amount && touched.amount ? errorStyle : inputStyle
                  }
                />
              </div>
              {errors.amount && touched.amount && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--red)" }}>
                  {errors.amount}
                </p>
              )}
            </div>

            {/* Category selector */}
            <div>
              <label
                className="block text-xs font-medium tracking-wider uppercase mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={isSelected}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all duration-200"
                      style={{
                        background: isSelected
                          ? `${CATEGORY_COLORS[cat]}18`
                          : "rgba(255,255,255,0.02)",
                        border: isSelected
                          ? `1.5px solid ${CATEGORY_COLORS[cat]}50`
                          : "1.5px solid rgba(255,255,255,0.06)",
                        color: isSelected
                          ? CATEGORY_COLORS[cat]
                          : "var(--text-muted)",
                        transform: isSelected ? "scale(1.04)" : "scale(1)",
                      }}
                    >
                      <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="expense-description"
                className="block text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Description
              </label>
              <input
                id="expense-description"
                type="text"
                placeholder="What was this expense for?"
                value={description}
                maxLength={100}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (touched.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, description: true }))
                }
                className={`${inputClass}`}
                style={
                  errors.description && touched.description
                    ? errorStyle
                    : inputStyle
                }
              />
              <div className="flex items-center justify-between mt-1.5">
                {errors.description && touched.description ? (
                  <p className="text-xs" style={{ color: "var(--red)" }}>
                    {errors.description}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {description.length}/100
                </span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="expense-date"
                className="block text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (touched.date) {
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, date: true }))
                }
                className={`${inputClass}`}
                style={
                  errors.date && touched.date ? errorStyle : inputStyle
                }
              />
              {errors.date && touched.date && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--red)" }}>
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 sm:px-8 py-4 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-muted)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.03)";
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "var(--accent)",
                color: "#050711",
                border: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#FAC040";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 20px rgba(240,165,0,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {initialExpense ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
