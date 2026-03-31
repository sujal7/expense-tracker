# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage  # Coverage report

# Run a single test file
npx jest __tests__/utils.test.ts
npx jest __tests__/storage.test.ts
```

## Architecture

This is a **single-page Next.js 14 app** with no backend. All state lives in `localStorage`.

### State management

`Dashboard` (`components/Dashboard.tsx`) is the single stateful root. It owns the full `Expense[]` array and the `ActiveView` enum (`dashboard | expenses | add | edit`). Every other component is purely presentational — they receive data and callbacks as props. There is no global state, context, or external store.

View routing is handled by `activeView` state in `Dashboard`, not by the Next.js router. `app/page.tsx` renders only `<Dashboard />`.

### Data flow

```
localStorage ↔ lib/storage.ts ↔ Dashboard (state) → child components
```

- `lib/storage.ts` — raw CRUD over `localStorage`. `isValidExpense` is the only guard against corrupt data; it validates against the known `Category` union.
- `lib/utils.ts` — pure functions: formatting, aggregation, seed data, `CATEGORIES`/`CATEGORY_COLORS`/`CATEGORY_ICONS` maps. No side effects.
- `lib/types.ts` — all shared TypeScript types (`Expense`, `Category`, `ActiveView`, etc.)

### Key constraints

- `Category` is a closed union (`Food | Transportation | Entertainment | Shopping | Bills | Other`). `CATEGORY_COLORS` and `CATEGORY_ICONS` in `lib/utils.ts` are keyed by this union — adding a category requires updating all three.
- Dates are stored as `YYYY-MM-DD` strings. `date-fns/parseISO` is used throughout; always guard against `isNaN(d.getTime())` after parsing.
- On first load with no data, `Dashboard` seeds from `getSeedExpenses()` and sets the `obsidian-ledger-seeded` flag so seed data isn't re-inserted.

### Tests

Tests live in `__tests__/` and cover only `lib/utils.ts` and `lib/storage.ts` (pure functions and storage helpers). Components are not tested. Jest uses `jsdom` environment with the `@/` alias mapped to the repo root.
