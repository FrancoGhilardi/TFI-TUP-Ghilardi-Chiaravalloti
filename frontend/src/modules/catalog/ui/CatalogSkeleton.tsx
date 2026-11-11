import { cn } from "@/modules/core/lib/utils";
import { Container } from "@/modules/core/ui/Container";
import { Skeleton } from "@/modules/core/ui/Skeleton";

import { catalogContent } from "../content/catalog";
import { PRODUCT_GRID_LAYOUTS } from "./product-grid-layouts";

const CARDS = 8;

/** Grey blocks shaped like the catalog page, while its products are read. */
export const CatalogSkeleton = () => {
  return (
    <Container role="status" aria-busy="true" className="flex flex-col gap-6 py-10">
      <span className="sr-only">{catalogContent.loading}</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid items-start gap-6 nav:grid-cols-[230px_minmax(0,1fr)]">
        <Skeleton className="hidden h-72 nav:block" />
        <div className="flex min-w-0 flex-col gap-5">
          <Skeleton className="h-11" />
          <div className={cn("grid gap-5", PRODUCT_GRID_LAYOUTS.catalog.columns)}>
            {Array.from({ length: CARDS }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/5]" />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
};
