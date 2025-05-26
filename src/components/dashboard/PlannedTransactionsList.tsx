import React from 'react';
import { usePlannedTransactions } from '../../store/PlannedTransactionsContext';

const PlannedTransactionsList: React.FC = () => {
  const { plannedTransactions, loading } = usePlannedTransactions();

  if (loading) return <div>Loading planned transactions...</div>;
  if (!plannedTransactions.length) return <div>No planned transactions.</div>;

  return (
    <div className="space-y-2">
      {plannedTransactions.map((pt) => (
        <div key={pt.id} className="border rounded p-2 flex flex-col">
          <div className="font-semibold">{pt.description}</div>
          <div>Amount: {pt.amount}</div>
          <div>Type: {pt.type}</div>
          <div>Bank: {pt.bank}</div>
          <div>Categories: {pt.categories.join(', ')}</div>
          <div>Start: {pt.startDate}</div>
          <div>Recurrence: {pt.recurrence.frequency}</div>
          <div>Reminder: {pt.reminderMinutesBefore ? `${pt.reminderMinutesBefore} min before` : 'None'}</div>
          <div>Status: {pt.active ? 'Active' : 'Inactive'}</div>
        </div>
      ))}
    </div>
  );
};

export default PlannedTransactionsList;
