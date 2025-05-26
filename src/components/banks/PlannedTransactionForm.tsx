import React, { useState } from "react";
import { PlannedTransaction, RecurrenceRule } from "../../lib/types";

interface PlannedTransactionFormProps {
  plannedTransaction?: PlannedTransaction;
  onSubmit: (pt: PlannedTransaction) => void;
  onCancel?: () => void;
}

const defaultRecurrence: RecurrenceRule = {
  frequency: "monthly",
  interval: 1,
};

export const PlannedTransactionForm: React.FC<PlannedTransactionFormProps> = ({
  plannedTransaction,
  onSubmit,
  onCancel,
}) => {
  const [form, setForm] = useState<PlannedTransaction>(
    plannedTransaction || {
      user: "",
      description: "",
      type: "expense",
      amount: 0,
      bank: "",
      categories: [],
      startDate: new Date().toISOString().slice(0, 10),
      recurrence: defaultRecurrence,
      reminderMinutesBefore: 60,
      active: true,
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleRecurrenceChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        [name]: type === "number" ? Number(value) : value,
      },
    }));
  };

  const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      categories: e.target.value.split(",").map((c) => c.trim()),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description"
        className="input"
        required
      />
      <select
        name="type"
        value={form.type}
        onChange={handleChange}
        className="input"
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
      </select>
      <input
        name="amount"
        type="number"
        value={form.amount}
        onChange={handleChange}
        placeholder="Amount"
        className="input"
        required
      />
      <input
        name="bank"
        value={form.bank}
        onChange={handleChange}
        placeholder="Bank ID"
        className="input"
        required
      />
      <input
        name="categories"
        value={form.categories.join(", ")}
        onChange={handleCategoriesChange}
        placeholder="Categories (comma separated)"
        className="input"
      />
      <input
        name="startDate"
        type="date"
        value={form.startDate}
        onChange={handleChange}
        className="input"
        required
      />
      <div className="flex gap-2">
        <label>Recurrence:</label>
        <select
          name="frequency"
          value={form.recurrence.frequency}
          onChange={handleRecurrenceChange}
          className="input"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input
          name="interval"
          type="number"
          value={form.recurrence.interval || 1}
          onChange={handleRecurrenceChange}
          className="input w-16"
          min={1}
        />
      </div>
      <input
        name="reminderMinutesBefore"
        type="number"
        value={form.reminderMinutesBefore || ""}
        onChange={handleChange}
        placeholder="Reminder (minutes before)"
        className="input"
        min={0}
      />
      <label>
        <input
          name="active"
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        />{" "}
        Active
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn">
          {plannedTransaction ? "Update" : "Create"}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
