import { getStoreRootCategories } from "@/modules/catalog";

import { CategoryShowcase } from "./CategoryShowcase";

export const CategoriesSection = async () => {
  return <CategoryShowcase categories={await getStoreRootCategories()} />;
};
