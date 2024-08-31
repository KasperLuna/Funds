import { Timestamp } from "firebase/firestore";

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

export type ExpandedTransaction = Transaction & {
  expand: {
    bank: Bank;
    categories: Category[];
  };
};

export type FirebaseTxTypes = Omit<Transaction, "date"> & { date: Timestamp };

export type Transfer = {
  description: string;
  originAmount: number;
  destinationAmount: number;
  originBank: string;
  destinationBank: string;
  date: Date;
  category?: string[];
};
