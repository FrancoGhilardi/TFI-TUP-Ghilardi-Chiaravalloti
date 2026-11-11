import { cn } from "@/modules/core/lib/utils";
import { Pagination } from "@/modules/core/ui/Pagination";

interface ListFooterProps {
  page: number;
  pageSize: number;
  /** Rows on this page. */
  shown: number;
  /** Rows in all, whatever the page. */
  total: number;
  /** Says which rows are shown, such as "21–40 de 45". */
  summary: (from: number, to: number, total: number) => string;
  hrefFor: (page: number) => string;
  /** What shows is the last read, not the one for this query: the range would not match. */
  stale?: boolean;
}

/** Under a list: which rows these are, and the links to the other pages. */
export const ListFooter = ({
  page,
  pageSize,
  shown,
  total,
  summary,
  hrefFor,
  stale,
}: ListFooterProps) => {
  const from = (page - 1) * pageSize + 1;
  const to = from + shown - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3">
      <p className={cn("text-sm text-ink-soft tabular-nums", stale && "invisible")}>
        {summary(from, to, total)}
      </p>
      <Pagination current={page} total={Math.ceil(total / pageSize)} hrefFor={hrefFor} />
    </div>
  );
};
