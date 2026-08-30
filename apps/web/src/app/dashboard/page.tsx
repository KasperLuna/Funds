import { Suspense } from "react";
import { DashboardScreen } from "@/components/home/dashboard-screen";

const DashboardPage = () => {
  return (
    <Suspense>
      <DashboardScreen />
    </Suspense>
  );
};

export default DashboardPage;
