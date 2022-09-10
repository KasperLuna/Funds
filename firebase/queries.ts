import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
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
    let isMounted = true;
    const getBanks = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as Bank);
        if (isMounted) {
          setBanks(data);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    };
    getBanks().catch(() => {
      if (!isMounted) return;
      showErrorNotif("Error fetching banks");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
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
    let isMounted = true;
    const getCategories = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as Category);
        if (isMounted) {
          setCategories(data);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    };
    getCategories().catch(() => {
      if (!isMounted) return;
      showErrorNotif("Error fetching categories");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { categories, loading };
};

export const useTransactionsQuery = (id?: string, bank?: string | string[]) => {
  const [transactions, setTransactions] = useState<FirebaseTxTypes[]>([]);
  const [loading, setLoading] = useState(true);

  const bankFilter = bank ? where("bank", "==", bank) : where("bank", "!=", "");

  const txRef = collection(db, "users", id || "", "transactions");
  const q = bank
    ? query(txRef, bankFilter, orderBy("date", "desc"))
    : query(txRef, orderBy("date", "desc"));
  useEffect(() => {
    let isMounted = true;
    const getTxns = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => doc.data() as FirebaseTxTypes);
        if (isMounted) {
          setTransactions(data);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    };
    getTxns().catch(() => {
      if (!isMounted) return;
      showErrorNotif("Error fetching transactions");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);
  return { transactions, loading };
};

export const createBank = async (data: Bank & { userId: string }) => {
  const { userId, ...bank } = data;
  try {
    setDoc(doc(db, "users", userId, "banks", bank.name), bank);
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
    updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance + txPosOrNeg(amount, data.type),
    } as Bank);
    const docRef = doc(collection(db, "users", userId, "transactions"));
    setDoc(docRef, { ...tx, id: docRef.id });
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
    updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance - OrigTx.amount,
    } as Bank);
    const bankQuery2 = query(bankRef, where("name", "==", data.bank));
    const bankQuerySnap2 = await getDocs(bankQuery2);
    const returnBank2 = bankQuerySnap2.docs[0].data();
    updateDoc(doc(db, "users", userId, "banks", returnBank2.name), {
      balance: returnBank2.balance + txPosOrNeg(data.amount, data.type),
    } as Bank);
    updateDoc(doc(db, "users", userId, "transactions", OrigTx.id || ""), newTx);
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
    updateDoc(doc(db, "users", userId, "banks", returnBank.name), {
      balance: returnBank.balance - transactionAmount,
    } as Bank);
    deleteDoc(doc(db, "users", userId, "transactions", transactionID || ""));
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
  createTransaction({
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

export const customizeBank = async (
  data: Bank & { userId: string; bankName: string }
) => {
  const { userId, bankName, ...bank } = data;
  try {
    updateDoc(doc(db, "users", userId, "banks", bankName), bank);
  } catch (e) {
    console.error("Error updating bank: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const deleteBank = async (data: Bank & { userId: string }) => {
  const { userId, ...bank } = data;
  try {
    // First delete all transactions associated with the bank
    const txRef = collection(db, "users", userId, "transactions");
    const txQuery = query(txRef, where("bank", "==", bank.name));
    const txQuerySnap = await getDocs(txQuery);
    txQuerySnap.forEach((doc) => {
      deleteDoc(doc.ref);
    });
    // Then delete the bank
    deleteDoc(doc(db, "users", userId, "banks", bank.name));
  } catch (e) {
    console.error("Error deleting bank: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const transferBankTransactions = async ({
  originBank,
  destinationBank,
  userId,
}: {
  originBank: string;
  destinationBank: string;
  userId: string;
}) => {
  try {
    // First get all transactions associated with the origin bank
    const txRef = collection(db, "users", userId, "transactions");
    const txQuery = query(txRef, where("bank", "==", originBank));
    const txQuerySnap = await getDocs(txQuery);
    // Then update the bank name for each transaction
    txQuerySnap.forEach((doc) => {
      updateDoc(doc.ref, { bank: destinationBank });
    });
  } catch (e) {
    console.error("Error transferring transactions: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const recomputeBankBalance = async ({
  userId,
  bankName,
}: {
  userId: string;
  bankName: string;
}) => {
  try {
    const txRef = collection(db, "users", userId, "transactions");
    const txQuery = query(txRef, where("bank", "==", bankName));
    const txQuerySnap = await getDocs(txQuery);
    let balance = 0;
    txQuerySnap.forEach((doc) => {
      const tx = doc.data();
      balance += tx.amount;
    });
    updateDoc(doc(db, "users", userId, "banks", bankName), { balance });
  } catch (e) {
    console.error("Error re-computing bank balance: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const deleteCategory = async ({
  userId,
  categoryName,
}: {
  userId: string;
  categoryName: string;
}) => {
  try {
    const txRef = collection(db, "users", userId, "transactions");
    const txQuery = query(
      txRef,
      where("category", "array-contains", categoryName)
    );
    const txQuerySnap = (await getDocs(
      txQuery
    )) as QuerySnapshot<FirebaseTxTypes>;
    // then remove the category from each transaction
    txQuerySnap.forEach((doc) => {
      const tx = doc.data();
      const newCategories = tx.category?.filter(
        (category) => category !== categoryName
      );
      updateDoc(doc.ref, { category: newCategories });
    });
    // then delete the category
    deleteDoc(doc(db, "users", userId, "categories", categoryName));
  } catch (e) {
    console.error("Error deleting category: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};

export const updateCategory = async ({
  userId,
  categoryName,
  newCategoryName,
}: {
  userId: string;
  categoryName: string;
  newCategoryName: string;
}) => {
  try {
    const txRef = collection(db, "users", userId, "transactions");
    const txQuery = query(
      txRef,
      where("category", "array-contains", categoryName)
    );
    const txQuerySnap = (await getDocs(
      txQuery
    )) as QuerySnapshot<FirebaseTxTypes>;
    // then update the category for each transaction
    txQuerySnap.forEach((doc) => {
      const tx = doc.data();
      const newCategories = tx.category?.map((category) =>
        category === categoryName ? newCategoryName : category
      );
      updateDoc(doc.ref, { category: newCategories });
    });
    // then update the category
    updateDoc(doc(db, "users", userId, "categories", categoryName), {
      name: newCategoryName,
    });
  } catch (e) {
    console.error("Error updating category: ", e);
    showErrorNotif("An Unexpected Error Occurred, try again later.");
  }
};
