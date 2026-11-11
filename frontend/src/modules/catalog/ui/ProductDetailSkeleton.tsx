import { Container } from "@/modules/core/ui/Container";
import { Skeleton } from "@/modules/core/ui/Skeleton";

import { productDetailContent } from "../content/product-detail";

/** Grey blocks shaped like the product page, while the product is read. */
export const ProductDetailSkeleton = () => {
  return (
    <Container role="status" aria-busy="true" className="flex flex-col gap-14 py-8">
      <span className="sr-only">{productDetailContent.loading}</span>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-4 w-56" />
        <div className="grid items-start gap-8 nav:grid-cols-2 nav:gap-12">
          <Skeleton className="aspect-square" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-12" />
          </div>
        </div>
      </div>
    </Container>
  );
};
