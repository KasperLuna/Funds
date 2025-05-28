export type User = {
  currency?: Currency;
  // System Values (can not be changed)
  email: string;
  emailVisibility: boolean;
  collectionId: string;
  collectionName: string;
  created: Date;
  id: string;
  updated: Date;
  username: string;
  verified: boolean;
};

export type Bank = {
  // default values
  id: string;
  created?: Date;
  updated?: Date;
  // custom values
  user: string;
  name: string;
  balance: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export type Category = {
  // default values
  id: string;
  created?: Date;
  updated?: Date;
  // custom values
  user: string;
  name: string;
  hideable: boolean;
  total_exempt?: boolean;
};

export type Token = {
  id: string;
  name: string;
  symbol: string;
  coingecko_id: string;
  total: number;
  costAvg: number;
  user: string;
};

export type Type = "income" | "expense" | "deposit" | "withdrawal";

export type Transaction = {
  // default values
  id?: string;
  created?: Date;
  updated?: Date;
  // custom values
  user: string;
  description: string;
  type: Type;
  amount: number;
  bank: string; // referring to bank account, will query Banks (e.g. BPI, BDO)
  categories: string[]; // referring to category (e.g. food, transportation, etc)
  date: string; // this is a parseable date string
};

export type FormType = "Transaction" | "Transfer" | "Difference";

export type ExpandedTransaction = Transaction & {
  expand?: {
    bank: Bank;
    categories: Category[];
  };
};

export type Transfer = {
  description: string;
  originAmount: number;
  destinationAmount: number;
  originBank: string;
  destinationBank: string;
  date: Date;
  category?: string[];
};

export type Trend = {
  year: number;
  month: string;
  monthly_total: number;
  overall_user_balance: number;
};

export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number; // e.g., every 2 weeks
};

export type PlannedTransaction = {
  id?: string;
  created?: Date;
  updated?: Date;
  user: string;
  description: string;
  type: Type;
  amount: number;
  bank: string;
  categories: string[];
  startDate: Date; // when the recurrence starts
  timezone: number; // timezone offset in hours
  recurrence: RecurrenceRule;
  lastNotifiedAt?: Date; // when the user was last notified about this planned transaction
  lastLoggedAt?: Date; // when the user last logged this planned transaction
  active: boolean;
};

export type PushSubscription = {
  id?: string;
  user: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created?: Date;
};
