import { IndexableType } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction, Type } from "./db";
import { txPosOrNeg } from "./helpers";
import { showSuccessNotif, showErrorNotif } from "./notifs";

export const useBanksQuery = () => {
  return useLiveQuery(async () => {
    return db.banks.toArray();
  });
};

export const useCategoriesQuery = () => {
  return useLiveQuery(async () => {
    return db.categories.toArray();
  });
};

export const useTransactionsQuery = () => {
  return useLiveQuery(async () => {
    return db.transactions.orderBy("date").reverse().toArray();
  });
};

export const addBank = async (name: string) => {
  db.banks
    .put({ name: name, balance: 0, primaryColor: "", secondaryColor: "" })
    .then(() => {
      showSuccessNotif("New bank added.");
    })
    .catch(() => {
      showErrorNotif();
    });
};

export const addCategory = async (name: string) => {
  db.categories
    .put({ name: name, color: "" })
    .then(() => {
      showSuccessNotif("New category added.");
    })
    .catch(() => {
      showErrorNotif();
    });
};

export type TxFormProps = {
  description: string;
  amount: number;
  date: Date;
  bank: string;
  type: Type;
};

export const addTransaction = async (data: TxFormProps) => {
  const { amount, bank, type } = data;
  const tx = {
    ...data,
    amount: txPosOrNeg(amount, type),
  };
  db.transaction("rw", db.transactions, db.banks, () => {
    db.banks
      .get({ name: bank })
      .then((updateBank) => {
        if (!updateBank) {
          throw new Error("Bank not found");
        }
        const newBalance = updateBank.balance + txPosOrNeg(amount, type);
        db.banks.update(updateBank, { balance: newBalance });
      })
      .then(() => {
        db.transactions.add(tx);
      });
  })
    .then(() => {
      showSuccessNotif("Transaction added.");
    })
    .catch(() => {
      showErrorNotif();
    });
};

export const deleteTransaction = async (
  bank: string,
  txAmount: number,
  txId: IndexableType
) => {
  db.transaction("rw", db.transactions, db.banks, () => {
    db.banks
      .get({ name: bank })
      .then((updateBank) => {
        if (!updateBank) {
          throw new Error("Bank not found");
        }
        db.banks.update(updateBank, { balance: updateBank.balance - txAmount });
      })
      .then(() => {
        db.transactions.delete(txId);
      });
  })
    .then(() => {
      showSuccessNotif("Transaction deleted.");
    })
    .catch(() => {
      showErrorNotif();
    });
};

export const updateTransaction = async (
  data: Transaction & { OrigTx: Transaction }
) => {
  const { OrigTx, ...tx } = data;
  const newTx = {
    ...tx,
    amount: txPosOrNeg(tx.amount, tx.type),
  };
  db.transaction("rw", db.banks, db.transactions, () => {
    db.banks
      .get({ name: tx.bank })
      .then((updateBank) => {
        if (!updateBank) {
          throw new Error("Bank not found");
        }
        const newBalance =
          updateBank.balance - OrigTx.amount + txPosOrNeg(tx.amount, tx.type);
        db.banks.update(updateBank, { balance: newBalance });
      })
      .then(() => {
        db.transactions.update(OrigTx, newTx);
      });
  })
    .then(() => {
      showSuccessNotif("Transaction Edited.");
    })
    .catch(() => {
      showErrorNotif();
    });
};
