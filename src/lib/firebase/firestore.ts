import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  Query,
  limit,
} from "firebase/firestore";
import dayjs from "dayjs";

import { db } from "@/lib/firebase/firebase";
import { useState, useEffect } from "react";
import { Bank, Category, FirebaseTxTypes } from "@/lib/types";
import { useAuth } from "../hooks/useAuth";

export const useBanksQuery = () => {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  const banksRef = collection(db, "users", user?.uid || "null", "banks");
  const q = query(banksRef, orderBy("balance", "desc"));

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const getBanks = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!isMounted) return;
        const data = snap.docs.map((doc) => doc.data() as Bank);
        setBanks(data);
        setLoading(false);
      });
      return () => unsubscribe();
    };
    getBanks().catch(() => {
      if (!isMounted) return;
      //   showErrorNotif("Error fetching banks");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return { banks, loading };
};

export const useTransactionsQuery = (
  filterBy: "latest" | Date | null = "latest",
  bank?: string | string[],
  categoryFilter?: string[]
) => {
  const { user } = useAuth();
  const id = user?.uid || "";
  const [transactions, setTransactions] = useState<FirebaseTxTypes[]>([]);
  const [loading, setLoading] = useState(true);

  const bankFilter = bank ? where("bank", "==", bank) : where("bank", "!=", "");
  const txRef = collection(db, "users", user?.uid || "null", "transactions");

  let q: Query;
  if (filterBy instanceof Date) {
    const start = dayjs(filterBy).startOf("month").toDate();
    const end = dayjs(filterBy).endOf("month").toDate();
    q = bank
      ? query(
          txRef,
          bankFilter,
          where("date", ">=", start),
          where("date", "<=", end),
          orderBy("date", "desc")
        )
      : query(
          txRef,
          where("date", ">=", start),
          where("date", "<=", end),
          orderBy("date", "desc")
        );
  } else if (
    filterBy === "latest" &&
    (!categoryFilter || categoryFilter.length === 0)
  ) {
    q = bank
      ? query(txRef, bankFilter, orderBy("date", "desc"), limit(20))
      : query(txRef, orderBy("date", "desc"), limit(20));
  } else if (filterBy === "latest" && categoryFilter) {
    q = bank
      ? query(
          txRef,
          bankFilter,
          where("category", "array-contains-any", categoryFilter),
          orderBy("date", "desc")
        )
      : query(
          txRef,
          where("category", "array-contains-any", categoryFilter),
          orderBy("date", "desc")
        );
  }

  useEffect(() => {
    let isMounted = true;
    const getTxns = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!isMounted) return;
        const data = snap.docs.map((doc) => doc.data() as FirebaseTxTypes);
        setTransactions(data);
        setLoading(false);
      });
      return () => unsubscribe();
    };
    getTxns().catch(() => {
      if (!isMounted) return;
      // showErrorNotif("Error fetching transactions");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, filterBy, categoryFilter, user]);
  return { transactions, loading };
};

export const useCategoriesQuery = () => {
  const { user } = useAuth();
  const id = user?.uid || "";
  const hasId = Boolean(id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categoriesRef = collection(db, "users", id || "null", "categories");
  const q = query(categoriesRef, orderBy("name", "asc"));
  useEffect(() => {
    if (!hasId) return;
    let isMounted = true;
    const getCategories = async () => {
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!isMounted) return;
        const data = snap.docs.map((doc) => doc.data() as Category);
        setCategories(data);
        setLoading(false);
      });
      return () => unsubscribe();
    };
    getCategories().catch(() => {
      if (!isMounted) return;
      // showErrorNotif("Error fetching categories");
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasId]);
  return { categories, loading };
};
