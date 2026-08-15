"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { Decimal } from "decimal.js";
import React, { useState } from "react";

function FormLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
    </div>
  );
}

const PlannedTransactionForm = dynamic(
  () =>
    import("./PlannedTransactionForm").then((m) => ({
      default: m.PlannedTransactionForm,
    })),
  { loading: () => <FormLoader /> },
);

const TransactionTemplateForm = dynamic(
  () =>
    import("./TransactionTemplateForm").then((m) => ({
      default: m.TransactionTemplateForm,
    })),
  { loading: () => <FormLoader /> },
);

const DIALOG_CONTENT_CLASS =
  "bg-slate-900 text-white border-2 border-slate-800 px-4 py-4 rounded-md";

export function AddPlannedDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { addPlannedTransaction } = usePlannedTransactions();
  const categoryData = useCategoriesQuery();
  const { user } = useAuth();
  const { addToast } = useToast();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={DIALOG_CONTENT_CLASS}>
        <DialogHeader>
          <DialogTitle>Create Planned Transaction</DialogTitle>
        </DialogHeader>
        <PlannedTransactionForm
          onSubmit={async (pt) => {
            if (!user?.id) {
              addToast({
                type: "error",
                title: "Sign in required",
                description:
                  "You must be logged in to create a planned transaction.",
              });
              return;
            }
            const mappedCategories =
              pt.categories.map(
                (categ) =>
                  categoryData?.categories.find((cat) => cat.name === categ)
                    ?.id || categ,
              ) || [];
            await addPlannedTransaction({
              ...pt,
              user: user.id,
              amount: ["expense", "withdrawal"].includes(pt.type)
                ? new Decimal(pt.amount).negated().toNumber()
                : new Decimal(pt.amount).toNumber(),
              categories: mappedCategories,
            });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddTemplateDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { addPlannedTransaction } = usePlannedTransactions();
  const categoryData = useCategoriesQuery();
  const { user } = useAuth();
  const { addToast } = useToast();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={DIALOG_CONTENT_CLASS}>
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <TransactionTemplateForm
          onSubmit={async (t) => {
            if (!user?.id) {
              addToast({
                type: "error",
                title: "Sign in required",
                description:
                  "You must be logged in to create a template.",
              });
              return;
            }
            const mappedCategories =
              t.categories.map(
                (categ) =>
                  categoryData?.categories.find((cat) => cat.name === categ)
                    ?.id || categ,
              ) || [];
            await addPlannedTransaction({
              ...t,
              user: user.id,
              isTemplate: true,
              amount: ["expense", "withdrawal"].includes(t.type)
                ? new Decimal(t.amount).abs().negated().toNumber()
                : new Decimal(t.amount).abs().toNumber(),
              categories: mappedCategories,
            });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
