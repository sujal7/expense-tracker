# Ledger — Expense Tracker

A modern, dark-themed personal finance tracker built with Next.js 14, TypeScript, and Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Dashboard** — summary cards (all-time, monthly, weekly, daily avg), 6-month bar chart, category breakdown
- **Expense list** — sortable table with search, category filter, and date range filter
- **Add / Edit** — form with validation, category picker, and date selector
- **Delete** — two-step confirm to prevent accidental deletions
- **CSV export** — exports the current filtered view
- **Persistence** — localStorage (no backend required)
- **Seed data** — 30 realistic sample expenses pre-loaded on first launch

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables |
| Date handling | date-fns |
| Testing | Jest + React Testing Library |

## Scripts

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run test suite
npm run test:watch   # Watch mode
npm run test:coverage  # Coverage report
npm run lint         # ESLint
```

## Project Structure

```
├── app/
│   ├── globals.css       # CSS variables, base styles
│   ├── layout.tsx        # Root layout + fonts
│   └── page.tsx          # Entry point
├── components/
│   ├── Dashboard.tsx     # App shell, state management, routing
│   ├── Navigation.tsx    # Top nav bar
│   ├── SummaryCards.tsx  # Stat cards row
│   ├── SpendingChart.tsx # SVG monthly bar chart
│   ├── CategoryBreakdown.tsx  # Category bar breakdown
│   ├── RecentExpenses.tsx     # Last 5 transactions
│   ├── ExpenseList.tsx   # Full table with filters
│   └── ExpenseForm.tsx   # Add / edit form
├── lib/
│   ├── types.ts          # Shared TypeScript types
│   ├── storage.ts        # localStorage read/write helpers
│   └── utils.ts          # Pure utility functions + seed data
└── __tests__/
    ├── utils.test.ts     # 30 tests covering all util functions
    └── storage.test.ts   # 13 tests covering CRUD storage ops
```

## Data Model

```ts
interface Expense {
  id: string;          // nanoid-style unique ID
  date: string;        // "YYYY-MM-DD"
  amount: number;      // in dollars (e.g. 12.50)
  category: Category;  // Food | Transportation | Entertainment | Shopping | Bills | Other
  description: string; // max 100 chars
  createdAt: string;   // ISO timestamp
}
```

Data is stored in `localStorage` under the key `obsidian-ledger-expenses`. Clear it via DevTools → Application → Local Storage to reset to seed data.
