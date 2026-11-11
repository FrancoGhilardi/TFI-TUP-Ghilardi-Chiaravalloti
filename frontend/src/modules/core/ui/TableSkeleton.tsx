const ROWS = 8;

interface TableSkeletonProps {
  /** Said to assistive technology while the rows are grey. */
  label: string;
}

/** Grey rows where a table will be, so the page does not jump when it loads. */
export const TableSkeleton = ({ label }: TableSkeletonProps) => {
  return (
    <ul aria-busy="true" aria-label={label} className="flex flex-col gap-3 p-4">
      {Array.from({ length: ROWS }, (_, index) => (
        <li key={index} className="h-14 animate-pulse rounded-xl bg-wheat" />
      ))}
    </ul>
  );
};
