import { Timestamp } from "firebase/firestore";

export type Bank = {
  name: string;
  balance: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export type Category = {
  id?: number;
  name: string;
};

export type Type = "income" | "expense" | "deposit" | "withdrawal";

export type BaseTxTypes = {
  id?: string;
  description: string;
  type: Type;
  amount: number;
  bank: string; // referring to bank account, will query Banks (e.g. BPI, BDO)
  category?: string[]; // referring to category (e.g. food, transportation, etc)
};

export type AppTxTypes = BaseTxTypes & { date: Date };
export type FirebaseTxTypes = BaseTxTypes & { date: Timestamp };

export type Transfer = {
  description: string;
  originAmount: number;
  destinationAmount: number;
  originBank: string;
  destinationBank: string;
  date: Date;
  category?: string[];
};
