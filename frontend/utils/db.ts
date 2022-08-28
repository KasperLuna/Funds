import Dexie, { Table } from "dexie";

export interface Friend {
  id?: number;
  name: string;
  age: number;
}

export interface Bank {
  id?: number;
  name: string;
  balance: number;
  primaryColor: string;
  secondaryColor: string;
}

const _SampleBank: Bank = {
  name: "BPI",
  balance: 0,
  primaryColor: "red",
  secondaryColor: "blue",
};

export interface Category {
  id?: number;
  name: string;
  color: string;
}

const _SampleCategory: Category = {
  name: "Food",
  color: "red",
};

export interface Transaction {
  id?: number; // primary key, auto increments
  description: string;
  amount: number;
  date: Date;
  bank: string; // referring to bank account, will query Banks (e.g. BPI, BDO)
  category: string; // referring to category (e.g. food, transportation, etc)
}

const _SampleTransaction: Transaction = {
  description: "Stayed at Starbs",
  amount: 150,
  date: new Date(),
  bank: "BPI",
  category: "Food",
};

export type Transfer = {
  description: string;
  originAmount: number;
  destinationAmount: number;
  date: Date;
  originBank: string;
  destinationBank: string;
};

const _SampleTransfer: Transfer = {
  description: "Transfer to BDO",
  originAmount: 150,
  destinationAmount: 100,
  date: new Date(),
  originBank: "BPI",
  destinationBank: "BDO",
};

export class MySubClassedDexie extends Dexie {
  // 'friends' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  friends!: Table<Friend>;
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
