import { Suspense } from "react";
import { AnalyticsScreen } from "./analytics-screen";

const AnalyticsPage = () => {
  return (
    <Suspense>
      <AnalyticsScreen />
    </Suspense>
  );
};

export default AnalyticsPage;
