import type { Category } from "./category";

export interface Transaction {
  date: string;
  merchant: string;
  amount: number;
  category: Category;
}

export interface CategoryBreakdown {
  id: Category;
  amount: number;
  count: number;
}

export interface Insight {
  total: number;
  count: number;
  breakdown: CategoryBreakdown[];
  summary: string;
}
