"use client";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

export function Onboarding() {
  const { banks, loading: banksLoading } = useBanksQuery();
  const { categories, loading: categoriesLoading } = useCategoriesQuery();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useTransactionsQuery();

  // Define onboarding steps with completion status
  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Create a Bank",
      description:
        "Add your first bank account to start tracking your finances",
      href: "/dashboard/banks?create=Bank",
      completed: banks && banks.length > 0,
    },
    {
      id: 2,
      title: "Create a Category",
      description: "Set up categories to organize your transactions",
      href: "/dashboard/banks?create=Category",
      completed: categories && categories.length > 0,
    },
    {
      id: 3,
      title: "Create a Transaction",
      description: "Record your first transaction to begin tracking",
      href: "/dashboard/banks?create=Transaction",
      completed: (transactionsData?.pages?.[0]?.items?.length ?? 0) > 0,
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;

  // Determine current step based on what's been completed
  const currentStep = completedSteps + 1;

  // Don't show if data is still loading
  if (banksLoading || categoriesLoading || transactionsLoading) {
    return null;
  }

  // Hide onboarding if user has transactions (completed the flow)
  if ((transactionsData?.pages?.[0]?.items?.length ?? 0) > 0) {
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
              {completedSteps}/{totalSteps}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm">
            Let's get you started with a few quick steps to set up your
            financial tracking.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                step.completed
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : currentStep === step.id
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-slate-700/30 border border-slate-600/30"
              }`}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle
                    className={`w-5 h-5 ${currentStep === step.id ? "text-blue-400" : "text-slate-500"}`}
                  />
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
                <p className="text-xs text-slate-400 mt-1">
                  {step.description}
                </p>
              </div>
              <div className="flex-shrink-0">
                {!step.completed && (
                  <Link href={step.href}>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                    >
                      {currentStep === step.id ? "Start" : "Complete"}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
