import React from 'react';
import { usePlannedTransactions } from '../../store/PlannedTransactionsContext';

const UpcomingPlannedTransactions: React.FC = () => {
  const { plannedTransactions } = usePlannedTransactions();
  const today = new Date();
  // Show only active and upcoming (startDate >= today)
  const upcoming = plannedTransactions.filter(pt => pt.active && new Date(pt.startDate) >= today);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-700">
      <div className="font-bold mb-2">Upcoming Planned Transactions</div>
      <div className="flex flex-col gap-2">
        {upcoming.map(pt => (
          <div key={pt.id} className="border rounded p-2 flex flex-col">
            <div className="font-semibold">{pt.description}</div>
            <div>Amount: {pt.amount}</div>
            <div>Type: {pt.type}</div>
            <div>Bank: {pt.bank}</div>
            <div>Categories: {pt.categories.join(', ')}</div>
            <div>Start: {pt.startDate}</div>
            <div>Recurrence: {pt.recurrence.frequency}</div>
            <div>Reminder: {pt.reminderMinutesBefore ? `${pt.reminderMinutesBefore} min before` : 'None'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingPlannedTransactions;
