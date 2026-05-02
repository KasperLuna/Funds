"use client";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { updateUser, addBank, addCategory } from "@/lib/pocketbase/queries";
import { CurrencySelector } from "@/components/dashboard/settings/CurrencySelector";
import { Input } from "@/components/ui/input";
import { Currency } from "@/lib/types";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

export function Onboarding() {
  const { banks, loading: banksLoading } = useBanksQuery();
  const { categories, loading: categoriesLoading } = useCategoriesQuery();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useTransactionsQuery();
  const { data: userData, isLoading: userLoading } = useUserQuery();
  const queryClient = useQueryClient();

  const [currencyConfirmed, setCurrencyConfirmed] = useLocalStorage(
    "onboarding_currency_confirmed",
    false,
  );

  const currencyForm = useForm<{ currency: Currency | undefined }>({
    defaultValues: { currency: undefined },
  });
  const bankForm = useForm<{ name: string }>({ defaultValues: { name: "" } });
  const categoryForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  const handleSaveCurrency = currencyForm.handleSubmit(async ({ currency }) => {
    const currencyToSave = currency ?? userData?.currency;
    if (!currencyToSave) return;
    const formData = new FormData();
    formData.append("currency", JSON.stringify(currencyToSave));
    if (userData?.username) formData.append("username", userData.username);
    await updateUser(formData);
    await queryClient.invalidateQueries({ queryKey: ["user"] });
    setCurrencyConfirmed(true);
  });

  const handleSaveBank = bankForm.handleSubmit(async ({ name }) => {
    const trimmed = name.trim();
    if (banks?.find((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      bankForm.setError("name", {
        message: `Bank named "${trimmed}" already exists`,
      });
      return;
    }
    await addBank({ name: trimmed, balance: 0 });
    bankForm.reset();
  });

  const handleSaveCategory = categoryForm.handleSubmit(async ({ name }) => {
    const trimmed = name.trim();
    if (categories?.find((c) => c.name === trimmed)) {
      categoryForm.setError("name", {
        message: `Category named "${trimmed}" already exists`,
      });
      return;
    }
    await addCategory({ name: trimmed });
    categoryForm.reset();
  });

  const isCurrencyComplete = currencyConfirmed || !!userData?.currency;
  const isBankComplete = !!(banks && banks.length > 0);
  const isCategoryComplete = !!(categories && categories.length > 0);
  const isTransactionComplete =
    (transactionsData?.pages?.[0]?.items?.length ?? 0) > 0;

  // Index of the first incomplete step (0-based)
  const completionFlags = [
    isCurrencyComplete,
    isBankComplete,
    isCategoryComplete,
    isTransactionComplete,
  ];
  const currentStepIndex = completionFlags.findIndex((c) => !c);
  const completedCount = completionFlags.filter(Boolean).length;
  const totalSteps = completionFlags.length;

  const steps = [
    {
      id: 0,
      title: "Set Your Currency",
      description:
        "Choose the currency your balances display in. This affects all amounts across the app.",
      completed: isCurrencyComplete,
      inline: "currency" as const,
    },
    {
      id: 1,
      title: "Create a Bank",
      description:
        "Banks represent your real accounts — checking, savings, cash, or credit cards.",
      completed: isBankComplete,
      inline: "bank" as const,
    },
    {
      id: 2,
      title: "Create a Category",
      description:
        "Categories tag transactions so you can see where money goes. You can set budgets per category.",
      completed: isCategoryComplete,
      inline: "category" as const,
    },
    {
      id: 3,
      title: "Create a Transaction",
      description:
        "Record your first transaction to start tracking your balance.",
      href: "/dashboard/banks?create=Transaction",
      completed: isTransactionComplete,
      inline: "link" as const,
    },
  ];

  if (banksLoading || categoriesLoading || transactionsLoading || userLoading) {
    return null;
  }

  // Hide once the whole flow is done
  if (isTransactionComplete) {
    return null;
  }

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-emerald-500/10 rounded-xl pointer-events-none" />
      <Card className="relative z-10 bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <CardTitle className="text-slate-200">Welcome to Funds!</CardTitle>
            <Badge
              variant="secondary"
              className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            >
              {completedCount}/{totalSteps}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm">
            Let&apos;s get you set up with a few quick steps.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isLocked = !step.completed && index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex gap-3 p-3 rounded-lg transition-all duration-200 ${
                  step.completed
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : isActive
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : "bg-slate-700/20 border border-slate-600/20 opacity-40"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 text-slate-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-medium ${
                      step.completed ? "text-emerald-300" : "text-slate-200"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {step.description}
                  </p>

                  {isActive && step.inline === "currency" && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Controller
                        name="currency"
                        control={currencyForm.control}
                        render={({ field: { onChange, value } }) => (
                          <CurrencySelector
                            value={value ?? userData?.currency}
                            onChange={onChange}
                          />
                        )}
                      />
                      <Button
                        size="sm"
                        disabled={currencyForm.formState.isSubmitting}
                        onClick={handleSaveCurrency}
                        className="w-fit bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                      >
                        {currencyForm.formState.isSubmitting
                          ? "Saving…"
                          : "Confirm Currency"}
                      </Button>
                    </div>
                  )}

                  {isActive && step.inline === "bank" && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Input
                        {...bankForm.register("name", {
                          required: "Bank name is required",
                        })}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveBank()}
                        placeholder="e.g. BPI, Metrobank, Cash"
                        className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                      {bankForm.formState.errors.name && (
                        <p className="text-red-400 text-xs">
                          {bankForm.formState.errors.name.message}
                        </p>
                      )}
                      <Button
                        size="sm"
                        disabled={bankForm.formState.isSubmitting}
                        onClick={handleSaveBank}
                        className="w-fit bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                      >
                        {bankForm.formState.isSubmitting
                          ? "Saving…"
                          : "Add Bank"}
                      </Button>
                    </div>
                  )}

                  {isActive && step.inline === "category" && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Input
                        {...categoryForm.register("name", {
                          required: "Category name is required",
                        })}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveCategory()
                        }
                        placeholder="e.g. Food, Transport, Rent"
                        className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                      {categoryForm.formState.errors.name && (
                        <p className="text-red-400 text-xs">
                          {categoryForm.formState.errors.name.message}
                        </p>
                      )}
                      <Button
                        size="sm"
                        disabled={categoryForm.formState.isSubmitting}
                        onClick={handleSaveCategory}
                        className="w-fit bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                      >
                        {categoryForm.formState.isSubmitting
                          ? "Saving…"
                          : "Add Category"}
                      </Button>
                    </div>
                  )}

                  {isActive && step.inline === "link" && (
                    <div className="mt-3">
                      <Link href={step.href ?? "#"}>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                        >
                          Start
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
