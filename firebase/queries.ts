import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  AppTxTypes,
  Bank,
  Category,
  FirebaseTxTypes,
  Transfer,
} from "../utils/db";
import { txPosOrNeg } from "../utils/helpers";
import { showErrorNotif } from "../utils/notifs";
import { db } from "./initFirebase";

export const useBanksQuery = (id?: string) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  const banksRef = collection(db, "users", id || "", "banks");
  const q = query(banksRef, orderBy("balance", "desc"));
  useEffect(() => {
    const getBanks = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as Bank);
        setBanks(data);
      });
      return () => unsubscribe();
    };
    getBanks();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { banks, loading };
};

export const useCategoriesQuery = (id?: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categoriesRef = collection(db, "users", id || "", "categories");
  const q = query(categoriesRef, orderBy("name", "asc"));
  useEffect(() => {
    const getCategories = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as Category);
        setCategories(data);
      });
      return () => unsubscribe();
    };
    getCategories();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { categories, loading };
};

export const useTransactionsQuery = (id?: string) => {
  const [transactions, setTransactions] = useState<FirebaseTxTypes[]>([]);
  const [loading, setLoading] = useState(true);

  const txRef = collection(db, "users", id || "", "transactions");
  const q = query(txRef, orderBy("date", "desc"));
  useEffect(() => {
    const getTxns = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as FirebaseTxTypes);
        setTransactions(data);
      });
      return () => unsubscribe();
    };
    getTxns();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { transactions, loading };
};

export const createBank = async (data: Bank & { userId: string }) => {
  const { userId, ...bank } = data;
  try {
    await setDoc(doc(db, "users", userId, "banks", bank.name), bank);
  } catch (e) {
    console.error("Error adding bank: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const createCategory = async (data: Category & { userId: string }) => {
  const { userId, ...category } = data;
  try {
    addDoc(collection(db, "users", userId, "categories"), category);
  } catch (e) {
    console.error("Error adding document: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const createTransaction = async (
  data: AppTxTypes & { userId: string }
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, amount, category, ...txData } = data;
  const tx = {
    amount: txPosOrNeg(amount, data.type),
    category: data.category ? data.category : [""],
    ...txData,
  };
  try {
    const bankRef = collection(db, "users", userId, "banks");
    const bankQuery = query(bankRef, where("name", "==", data.bank));
    const bankQuerySnap = await getDocs(bankQuery);
    const returnBank = bankQuerySnap.docs[0].data();
    await updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance + txPosOrNeg(amount, data.type),
    } as Bank);
    const docRef = doc(collection(db, "users", userId, "transactions"));
    await setDoc(docRef, { ...tx, id: docRef.id });
  } catch (e) {
    console.log("Transaction failed: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const updateTransaction = async (
  data: AppTxTypes & { OrigTx: FirebaseTxTypes } & { userId: string }
) => {
  const { userId, OrigTx, ...txData } = data;

  const newTx = {
    ...txData,
    category: data.category ? data.category : [""],
    amount: txPosOrNeg(txData.amount, txData.type),
  };
  try {
    const bankRef = collection(db, "users", userId, "banks");
    const bankQuery = query(bankRef, where("name", "==", OrigTx.bank));
    const bankQuerySnap = await getDocs(bankQuery);
    const returnBank = bankQuerySnap.docs[0].data();
    await updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance - OrigTx.amount,
    } as Bank);
    const bankQuery2 = query(bankRef, where("name", "==", data.bank));
    const bankQuerySnap2 = await getDocs(bankQuery2);
    const returnBank2 = bankQuerySnap2.docs[0].data();
    await updateDoc(doc(db, "users", userId, "banks", returnBank2.name), {
      balance: returnBank2.balance + txPosOrNeg(data.amount, data.type),
    } as Bank);
    await updateDoc(
      doc(db, "users", userId, "transactions", OrigTx.id || ""),
      newTx
    );
  } catch (e) {
    console.log("Transaction failed: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const deleteTransaction = async ({
  userId,
  transactionID,
  transactionAmount,
  bank,
}: {
  userId: string;
  transactionID?: string;
  transactionAmount: number;
  bank: string;
}) => {
  try {
    const bankRef = collection(db, "users", userId, "banks");
    const bankQuery = query(bankRef, where("name", "==", bank));
    const bankQuerySnap = await getDocs(bankQuery);
    const returnBank = bankQuerySnap.docs[0].data();
    await updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance - transactionAmount,
    } as Bank);
    await deleteDoc(
      doc(db, "users", userId, "transactions", transactionID || "")
    );
  } catch (e) {
    console.log("Transaction failed: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const createTransfer = async (data: Transfer & { userId: string }) => {
  const {
    date,
    description,
    category,
    originBank,
    originAmount,
    destinationBank,
    destinationAmount,
    userId,
  } = data;
  await createTransaction({
    amount: originAmount,
    bank: originBank,
    date,
    description,
    type: "withdrawal",
    category,
    userId,
  }).then(() => {
    createTransaction({
      amount: destinationAmount ? destinationAmount : originAmount,
      bank: destinationBank,
      date,
      description,
      type: "deposit",
      category,
      userId,
    });
  });
};
