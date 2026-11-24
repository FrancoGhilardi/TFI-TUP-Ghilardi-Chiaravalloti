import type { UseQueryResult } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";

import { ListFooter } from "@/modules/core/ui/ListFooter";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { OutOfRangeState } from "@/modules/core/ui/OutOfRangeState";
import { TableSkeleton } from "@/modules/core/ui/TableSkeleton";

interface ListResultsProps<Item> {
  list: UseQueryResult<{ items: Item[]; total: number }>;
  page: number;
  pageSize: number;
  /** The first page of the same query, for when the page asked for is past the end. */
  firstPageHref: string;
  hrefFor: (page: number) => string;
  text: {
    loading: string;
    error: Omit<ComponentProps<typeof LoadErrorState>, "onRetry" | "framed">;
    outOfRange: Omit<ComponentProps<typeof OutOfRangeState>, "firstPageHref">;
    summary: (from: number, to: number, total: number) => string;
  };
  /** What a query that finds nothing shows. */
  empty: ReactNode;
  /** The rows found; `readAt` is when they were read. */
  children: (items: Item[], readAt: Date) => ReactNode;
}

/** What a list query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const ListResults = <Item,>({
  list,
  page,
  pageSize,
  firstPageHref,
  hrefFor,
  text,
  empty,
  children,
}: ListResultsProps<Item>) => {
  if (list.isPending) {
    return <TableSkeleton label={text.loading} />;
  }
  // A refresh that fails keeps showing the last page; only having nothing to show is an error.
  if (!list.data) {
    return <LoadErrorState {...text.error} onRetry={() => void list.refetch()} framed />;
  }

  const { items, total } = list.data;
  if (items.length === 0) {
    return page > 1 ? (
      <OutOfRangeState {...text.outOfRange} firstPageHref={firstPageHref} />
    ) : (
      empty
    );
  }

  return (
    // While the next page loads, the last one stays as a reference but cannot be acted on: it is not
    // what the filters and the page on screen now describe.
    <div
      aria-busy={list.isFetching}
      inert={list.isPlaceholderData}
      className={list.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
    >
      <div className="overflow-x-auto md:overflow-visible">
        {children(items, new Date(list.dataUpdatedAt))}
      </div>
      <ListFooter
        page={page}
        pageSize={pageSize}
        shown={items.length}
        total={total}
        summary={text.summary}
        hrefFor={hrefFor}
        stale={list.isPlaceholderData}
      />
    </div>
  );
};
