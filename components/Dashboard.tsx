"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Expense, ActiveView } from "@/lib/types";
import {
  getExpenses,
  saveExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  hasSeeded,
  markSeeded,
} from "@/lib/storage";
import { getSeedExpenses } from "@/lib/utils";
import Navigation from "./Navigation";
import SummaryCards from "./SummaryCards";
import SpendingChart from "./SpendingChart";
import CategoryBreakdown from "./CategoryBreakdown";
import ExpenseList from "./ExpenseList";
import ExpenseForm from "./ExpenseForm";
import RecentExpenses from "./RecentExpenses";

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = getExpenses();
    if (stored.length === 0 && !hasSeeded()) {
      const seed = getSeedExpenses();
      saveExpenses(seed);
      markSeeded();
      setExpenses(seed);
    } else {
      setExpenses(stored);
    }
    setMounted(true);
  }, []);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
      setNotification({ message, type });
      notificationTimer.current = setTimeout(() => setNotification(null), 3000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, []);

  const handleAddExpense = useCallback(
    (expense: Expense) => {
      setExpenses((prev) => addExpense(expense, prev));
      setActiveView("expenses");
      showNotification("Expense added successfully");
    },
    [showNotification]
  );

  const handleUpdateExpense = useCallback(
    (expense: Expense) => {
      setExpenses((prev) => updateExpense(expense, prev));
      setEditingExpense(null);
      setActiveView("expenses");
      showNotification("Expense updated");
    },
    [showNotification]
  );

  const handleDeleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => deleteExpense(id, prev));
      showNotification("Expense deleted");
    },
    [showNotification]
  );

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setActiveView("edit");
  }, []);

  const handleNavigation = useCallback(
    (view: ActiveView) => {
      if (view !== "edit") setEditingExpense(null);
      setActiveView(view);
    },
    []
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p
            className="font-display text-2xl tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            LEDGER
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid">
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(240,165,0,0.04) 0%, transparent 70%)",
        }}
      />

      <Navigation
        activeView={activeView}
        onNavigate={handleNavigation}
        expenseCount={expenses.length}
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className="fixed top-20 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{
            background:
              notification.type === "success"
                ? "rgba(0,200,150,0.12)"
                : "rgba(232,64,64,0.12)",
            border: `1px solid ${
              notification.type === "success"
                ? "rgba(0,200,150,0.3)"
                : "rgba(232,64,64,0.3)"
            }`,
            color:
              notification.type === "success"
                ? "var(--green)"
                : "var(--red)",
            backdropFilter: "blur(8px)",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <span>{notification.type === "success" ? "✓" : "✕"}</span>
          {notification.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <div
            className="pt-8 space-y-6"
            style={{ animation: "fadeIn 0.4s ease-out" }}
          >
            <div className="mb-2">
              <h1
                className="font-display text-4xl sm:text-5xl font-light tracking-tight"
                style={{ color: "var(--text)" }}
              >
                Financial Overview
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Your spending at a glance
              </p>
            </div>

            <SummaryCards expenses={expenses} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <SpendingChart expenses={expenses} />
              </div>
              <div className="lg:col-span-2">
                <CategoryBreakdown expenses={expenses} />
              </div>
            </div>

            <RecentExpenses
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onViewAll={() => handleNavigation("expenses")}
            />
          </div>
        )}

        {/* Expenses List View */}
        {activeView === "expenses" && (
          <div
            className="pt-8"
            style={{ animation: "fadeIn 0.4s ease-out" }}
          >
            <div className="mb-6">
              <h1
                className="font-display text-4xl sm:text-5xl font-light tracking-tight"
                style={{ color: "var(--text)" }}
              >
                All Expenses
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {expenses.length} record{expenses.length !== 1 ? "s" : ""} total
              </p>
            </div>
            <ExpenseList
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
          </div>
        )}

        {/* Add Expense View */}
        {activeView === "add" && (
          <div
            className="pt-8"
            style={{ animation: "fadeIn 0.4s ease-out" }}
          >
            <div className="mb-6">
              <h1
                className="font-display text-4xl sm:text-5xl font-light tracking-tight"
                style={{ color: "var(--text)" }}
              >
                New Expense
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Record a new transaction
              </p>
            </div>
            <ExpenseForm
              onSubmit={handleAddExpense}
              onCancel={() => handleNavigation("dashboard")}
            />
          </div>
        )}

        {/* Edit Expense View */}
        {activeView === "edit" && editingExpense && (
          <div
            className="pt-8"
            style={{ animation: "fadeIn 0.4s ease-out" }}
          >
            <div className="mb-6">
              <h1
                className="font-display text-4xl sm:text-5xl font-light tracking-tight"
                style={{ color: "var(--text)" }}
              >
                Edit Expense
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Modify this transaction
              </p>
            </div>
            <ExpenseForm
              initialExpense={editingExpense}
              onSubmit={handleUpdateExpense}
              onCancel={() => handleNavigation("expenses")}
            />
          </div>
        )}
      </main>
    </div>
  );
}
