"use client";

import { useState } from "react";
import type { Account, Txn } from "@/lib/accounts/accounts-store";

export interface BanksDialogState {
  accountDialogOpen: boolean;
  editAccount: Account | null;
  openNewAccount: () => void;
  openRenameAccount: (a: Account) => void;
  setAccountDialogOpen: (open: boolean) => void;
  captureOpen: boolean;
  editTxn: Txn | null;
  openCapture: () => void;
  startEditTxn: (txn: Txn) => void;
  setCaptureOpen: (open: boolean) => void;
  transferOpen: boolean;
  setTransferOpen: (open: boolean) => void;
  reconcileAccount: Account | null;
  openReconcile: (a: Account) => void;
  setReconcileAccount: (a: Account | null) => void;
}

export function useBanksDialogState(): BanksDialogState {
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(null);

  return {
    accountDialogOpen,
    editAccount,
    openNewAccount: () => {
      setEditAccount(null);
      setAccountDialogOpen(true);
    },
    openRenameAccount: (a) => {
      setEditAccount(a);
      setAccountDialogOpen(true);
    },
    setAccountDialogOpen: (open) => {
      setAccountDialogOpen(open);
      if (!open) setEditAccount(null);
    },
    captureOpen,
    editTxn,
    openCapture: () => {
      setEditTxn(null);
      setCaptureOpen(true);
    },
    startEditTxn: (txn) => {
      setEditTxn(txn);
      setCaptureOpen(true);
    },
    setCaptureOpen: (open) => {
      setCaptureOpen(open);
      if (!open) setEditTxn(null);
    },
    transferOpen,
    setTransferOpen,
    reconcileAccount,
    openReconcile: setReconcileAccount,
    setReconcileAccount,
  };
}
