export type Category =
  | "Food"
  | "Transportation"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Other";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
}

export interface FilterState {
  category: Category | "All";
  dateFrom: string;
  dateTo: string;
  search: string;
}

export type SortField = "date" | "amount" | "category";
export type SortOrder = "asc" | "desc";

export type ActiveView = "dashboard" | "expenses" | "add" | "edit";
