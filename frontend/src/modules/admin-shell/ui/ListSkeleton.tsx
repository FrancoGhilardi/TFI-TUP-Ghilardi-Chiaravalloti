import { Skeleton } from "@/modules/core/ui/Skeleton";

interface ListSkeletonProps {
  rows: number;
}

/** Grey rows where a list will be, so the page does not jump when it loads. */
export const ListSkeleton = ({ rows }: ListSkeletonProps) => {
  return (
    <ul aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} aria-hidden="true">
          <Skeleton className="h-11" />
        </li>
      ))}
    </ul>
  );
};
