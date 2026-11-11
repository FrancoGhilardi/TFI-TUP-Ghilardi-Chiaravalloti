import { Container } from "@/modules/core/ui/Container";
import { Skeleton } from "@/modules/core/ui/Skeleton";

import { storeSystemPagesContent } from "../content/system-pages";

/** Grey blocks for any page of the store that has none of its own, while it loads. */
export const StoreLoading = () => {
  return (
    <Container role="status" aria-busy="true" className="flex flex-col gap-6 py-10">
      <span className="sr-only">{storeSystemPagesContent.loading}</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="hidden h-48 lg:block" />
      </div>
    </Container>
  );
};
