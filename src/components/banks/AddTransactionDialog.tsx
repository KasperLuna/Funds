import { useState } from "react";
import { TransactionDialog } from "@/components/banks/transactions/TransactionDialog";

export const AddTransactionDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <TransactionDialog
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      trigger={children}
    />
  );
};
