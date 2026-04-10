// =============================================================================
// Core Domain Types - Funds Personal Finance Tracker
// =============================================================================

// --- Enums & Primitives ---

export type TransactionType = "income" | "expense" | "deposit" | "withdrawal";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
}

// --- Core Entities ---

export interface User {
  id: string;
  email: string;
  username: string;
  currency: Currency;
  emailVisibility: boolean;
  verified: boolean;
  created: Date;
  updated: Date;
}

export interface Bank {
  id: string;
  user: string;
  name: string;
  balance: number;
  primaryColor?: string;
  secondaryColor?: string;
  created?: Date;
  updated?: Date;
}

export interface Category {
  id: string;
  user: string;
  name: string;
  hideable: boolean;
  total_exempt?: boolean;
  monthly_budget?: number;
  created?: Date;
  updated?: Date;
}

export interface Transaction {
  id?: string;
  user: string;
  description: string;
  type: TransactionType;
  amount: number;
  bank: string;
  categories: string[];
  date: string;
  created?: Date;
  updated?: Date;
}

export interface Transfer {
  description: string;
  originAmount: number;
  destinationAmount: number;
  originBank: string;
  destinationBank: string;
  date: Date;
  category?: string[];
}

export interface PlannedTransaction {
  id?: string;
  user: string;
  description: string;
  type: TransactionType;
  amount: number;
  bank: string;
  categories: string[];
  recurrence: RecurrenceRule;
  timezone: number;
  previousDate: Date | null;
  invokeDate: Date;
  lastNotifiedAt?: Date;
  active: boolean;
  created?: Date;
  updated?: Date;
}

export interface Token {
  id: string;
  user: string;
  name: string;
  symbol: string;
  coingecko_id: string;
  total: number;
  costAvg: number;
  created?: Date;
  updated?: Date;
}

export interface PushSubscription {
  id?: string;
  user: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created?: Date;
}

// --- Expanded Types (resolved relations) ---

export interface ExpandedTransaction extends Transaction {
  expand?: {
    bank?: Bank;
    categories?: Category[];
  };
}

// --- Form Data Types ---

export type BankFormData = Pick<Bank, "name" | "primaryColor" | "secondaryColor">;

export type TransactionFormData = {
  description: string;
  type: TransactionType;
  amount: number;
  bank: string;
  categories: string[];
  date: Date;
};

export type CategoryFormData = {
  name: string;
  monthly_budget?: number;
  hideable: boolean;
  total_exempt?: boolean;
};

export type TokenFormData = {
  name: string;
  symbol: string;
  coingecko_id: string;
  total: number;
  costAvg: number;
};

export type PlannedTransactionFormData = {
  description: string;
  type: TransactionType;
  amount: number;
  bank: string;
  categories: string[];
  recurrence: RecurrenceRule;
  timezone: number;
};

// --- Filter Types ---

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TransactionFilters {
  bank?: string;
  categories?: string[];
  type?: TransactionType;
  dateRange?: DateRange;
  searchText?: string;
}
