import { Package, PackageX, Tag, TriangleAlert } from "lucide-react";

import { useCategoriesTotal } from "@/modules/admin-categories";
import { useLowStockProducts, useProductsTotal } from "@/modules/admin-products";
import { ADMIN_PATHS } from "@/modules/auth";

import { homeContent } from "../content/home";
import { LOW_STOCK_ROWS } from "../domain/home-lists";
import { StatCard } from "./StatCard";

export const HomeStats = () => {
  const active = useProductsTotal("ACTIVE");
  const inactive = useProductsTotal("INACTIVE");
  const lowStock = useLowStockProducts(LOW_STOCK_ROWS);
  const categories = useCategoriesTotal("ACTIVE");
  const { stats } = homeContent;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={stats.activeProducts}
        icon={Package}
        tone="teal"
        href={ADMIN_PATHS.products}
        value={active.data}
        isError={active.isError}
        onRetry={() => void active.refetch()}
      />
      <StatCard
        label={stats.inactiveProducts}
        icon={PackageX}
        tone="wheat"
        href={ADMIN_PATHS.products}
        value={inactive.data}
        isError={inactive.isError}
        onRetry={() => void inactive.refetch()}
      />
      <StatCard
        label={stats.lowStock}
        icon={TriangleAlert}
        tone="coral"
        href={ADMIN_PATHS.products}
        value={lowStock.data?.total}
        isError={lowStock.isError}
        onRetry={() => void lowStock.refetch()}
      />
      <StatCard
        label={stats.activeCategories}
        icon={Tag}
        tone="gold"
        href={ADMIN_PATHS.categories}
        value={categories.data}
        isError={categories.isError}
        onRetry={() => void categories.refetch()}
      />
    </div>
  );
};
