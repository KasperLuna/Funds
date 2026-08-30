import { Suspense } from "react";
import { DashboardScreen } from "@/components/home/dashboard-screen";

const DashboardFallback = () => (
  <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4" aria-busy>
    <div className="h-9 w-24 animate-pulse rounded-(--radius-md) bg-(--surface-2)" />
    <div className="h-32 animate-pulse rounded-(--radius-lg) bg-(--surface-2)" />
    <div className="h-24 animate-pulse rounded-(--radius-lg) bg-(--surface-2)" />
    <div className="h-24 animate-pulse rounded-(--radius-lg) bg-(--surface-2)" />
  </div>
);

const DashboardPage = () => {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardScreen />
    </Suspense>
  );
};

export default DashboardPage;
