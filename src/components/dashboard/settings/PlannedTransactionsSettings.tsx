import React, { useState } from 'react';
import { usePlannedTransactions } from '../../../store/PlannedTransactionsContext';
import { PlannedTransaction } from '../../../lib/types';
import { PlannedTransactionForm } from '../../banks/PlannedTransactionForm';
import { useAuth } from '../../../lib/hooks/useAuth';

const PlannedTransactionsSettings: React.FC = () => {
  const { plannedTransactions, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction } = usePlannedTransactions();
  const [editing, setEditing] = useState<PlannedTransaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (pt: PlannedTransaction) => {
    setEditing(pt);
    setShowForm(true);
  };

  const handleSubmit = async (pt: PlannedTransaction) => {
    if (!user?.id) {
      alert('You must be logged in.');
      return;
    }
    if (editing) {
      await updatePlannedTransaction({ ...pt, user: user.id });
    } else {
      await addPlannedTransaction({ ...pt, user: user.id });
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      <div className="font-semibold flex items-center justify-between">
        <span>Manage Planned Transactions</span>
        <button className="btn" onClick={handleAdd}>Add</button>
      </div>
      {showForm && (
        <div className="border rounded p-2 bg-slate-900">
          <PlannedTransactionForm
            plannedTransaction={editing || undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}
      {plannedTransactions.length === 0 && <div>No planned transactions.</div>}
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
          <div className="flex gap-2 mt-2">
            <button className="btn" onClick={() => handleEdit(pt)}>Edit</button>
            <button className="btn" onClick={() => pt.id && deletePlannedTransaction(pt.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlannedTransactionsSettings;
