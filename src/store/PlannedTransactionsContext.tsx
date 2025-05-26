import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlannedTransaction } from '../lib/types';
import { pb } from '../lib/pocketbase/pocketbase';
import { useAuth } from '../lib/hooks/useAuth';

interface PlannedTransactionsContextProps {
  plannedTransactions: PlannedTransaction[];
  loading: boolean;
  fetchPlannedTransactions: () => Promise<void>;
  addPlannedTransaction: (pt: PlannedTransaction) => Promise<void>;
  updatePlannedTransaction: (pt: PlannedTransaction) => Promise<void>;
  deletePlannedTransaction: (id: string) => Promise<void>;
}

const PlannedTransactionsContext = createContext<PlannedTransactionsContextProps | undefined>(undefined);

function recordToPlannedTransaction(record: any): PlannedTransaction {
  // Map PocketBase record to PlannedTransaction type
  return {
    id: record.id,
    created: record.created ? new Date(record.created) : undefined,
    updated: record.updated ? new Date(record.updated) : undefined,
    user: record.user,
    description: record.description,
    type: record.type,
    amount: record.amount,
    bank: record.bank,
    categories: record.categories,
    startDate: record.startDate,
    recurrence: record.recurrence,
    reminderMinutesBefore: record.reminderMinutesBefore,
    active: record.active,
  };
}

export const PlannedTransactionsProvider = ({ children }: { children: ReactNode }) => {
  const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchPlannedTransactions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('planned_transactions').getFullList({
        filter: `user="${user.id}"`,
        sort: 'startDate',
      });
      setPlannedTransactions(records.map(recordToPlannedTransaction));
    } catch (e) {
      setPlannedTransactions([]);
      if (process.env.NODE_ENV === 'development') console.error(e);
    }
    setLoading(false);
  };

  const addPlannedTransaction = async (pt: PlannedTransaction) => {
    if (!user?.id) return;
    const record = await pb.collection('planned_transactions').create({ ...pt, user: user.id });
    setPlannedTransactions((prev) => [...prev, recordToPlannedTransaction(record)]);
  };

  const updatePlannedTransaction = async (pt: PlannedTransaction) => {
    if (!pt.id) return;
    const record = await pb.collection('planned_transactions').update(pt.id, pt);
    setPlannedTransactions((prev) => prev.map((t) => (t.id === pt.id ? recordToPlannedTransaction(record) : t)));
  };

  const deletePlannedTransaction = async (id: string) => {
    await pb.collection('planned_transactions').delete(id);
    setPlannedTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    fetchPlannedTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <PlannedTransactionsContext.Provider
      value={{ plannedTransactions, loading, fetchPlannedTransactions, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction }}
    >
      {children}
    </PlannedTransactionsContext.Provider>
  );
};

export const usePlannedTransactions = () => {
  const context = useContext(PlannedTransactionsContext);
  if (!context) throw new Error('usePlannedTransactions must be used within PlannedTransactionsProvider');
  return context;
};
