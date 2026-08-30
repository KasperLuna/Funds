import { Suspense } from "react";
import { AssetsScreen } from "./assets-screen";

const AssetsPage = () => {
  return (
    <Suspense>
      <AssetsScreen />
    </Suspense>
  );
};

export default AssetsPage;
