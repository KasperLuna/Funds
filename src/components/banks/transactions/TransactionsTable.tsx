import React from "react";
import { ExpandedTransaction } from "@/lib/types";
import { TransactionsTableRow } from "./TransactionsTableRow";

interface TransactionsTableProps {
  transactions: ExpandedTransaction[];
  handleFetchNextPage?: () => void;
  loaderRow?: React.ReactNode;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  handleFetchNextPage,
  loaderRow,
}) => {
  return (
    <div className="overflow-x-auto w-full overflow-auto max-h-[calc(100dvh-200px)]">
      <table className="min-w-full text-slate-100 border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 backdrop-blur border-b-2 shadow-md bg-slate-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold tracking-wide  bg-transparent">
              Date
            </th>
            <th className="px-4 py-3 text-left font-semibold tracking-wide  bg-transparent">
              Bank
            </th>
            <th className="px-4 py-3 text-left font-semibold tracking-wide  bg-transparent">
              Amount
            </th>
            <th className="px-4 py-3 text-left font-semibold tracking-wide  bg-transparent">
              Description
            </th>
            <th className="px-4 py-3 text-left font-semibold tracking-wide  bg-transparent">
              Categories
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, idx) => (
            <TransactionsTableRow
              key={txn.id}
              transaction={txn}
              odd={idx % 2 === 1}
            />
          ))}
          {loaderRow}
        </tbody>
      </table>
    </div>
  );
};
