import Dexie, { Table } from "dexie";

export interface Bank {
  id?: number;
  name: string;
  balance: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface Category {
  id?: number;
  name: string;
  color: string;
}

export interface Transaction {
  id?: number; // primary key, auto increments
  description: string;
  amount: number;
  date: Date;
  bank: string; // referring to bank account, will query Banks (e.g. BPI, BDO)
  category: string; // referring to category (e.g. food, transportation, etc)
}

export type Transfer = {
  description: string;
  originAmount: number;
  destinationAmount: number;
  date: Date;
  originBank: string;
  destinationBank: string;
};

export class MySubClassedDexie extends Dexie {
  transactions!: Table<Transaction>;
  banks!: Table<Bank>;
  categories!: Table<Category>;

  constructor() {
    super("myDatabase");
    this.version(5).stores({
      transactions: "++id, description, amount, date, account, category",
      banks: "++id, name, balance, primaryColor, secondaryColor",
      categories: "++id, name, color",
    });
  }
}

export const db = new MySubClassedDexie();
