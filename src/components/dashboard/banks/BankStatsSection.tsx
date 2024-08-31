import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { StatCard } from "./BankStatCard";
import { TransactionCardLoader } from "@/components/banks/transactions/TransactionCardLoader";
import { BankStatCardLoader } from "./BankStatCardLoader";

export const BankStatsSection = () => {
  const { bankData } = useBanksCategsContext();
  const { banks, loading } = bankData || {};
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <div
      id="bank-stats-section"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-3"
    >
      {loading && [...Array(5)].map((_, i) => <BankStatCardLoader key={i} />)}
      {banks?.map((bank) => (
        <StatCard
          key={bank.id}
          {...bank}
          percentage={`${((bank.balance / totalAmount) * 100).toPrecision(2)}%`}
        />
      ))}
    </div>
  );
};
