import { Suspense } from "react";
import { CategoriesScreen } from "./categories-screen";

const CategoriesPage = () => {
  return (
    <Suspense>
      <CategoriesScreen />
    </Suspense>
  );
};

export default CategoriesPage;
