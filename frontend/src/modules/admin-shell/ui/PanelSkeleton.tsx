import { Skeleton } from "@/modules/core/ui/Skeleton";

import { shellContent } from "../content/shell";

/** Grey blocks shaped like the panel's frame, while the session is looked up. */
export const PanelSkeleton = () => {
  return (
    <main aria-busy="true" className="min-h-dvh bg-cream lg:grid lg:grid-cols-[278px_1fr]">
      <span role="status" className="sr-only">
        {shellContent.loading}
      </span>
      <aside className="hidden flex-col gap-3 p-5 lg:flex">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-4 h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </aside>
      <div className="flex flex-col gap-6 p-5 sm:p-8">
        <Skeleton className="h-12" />
        <Skeleton className="h-24 max-w-md" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </main>
  );
};
