import { Skeleton } from "@/modules/core/ui/Skeleton";

interface FormSkeletonProps {
  /** Said to assistive technology while the blocks are grey. */
  label: string;
}

/** Grey blocks where a form will be, so the page does not jump when what it edits arrives. */
export const FormSkeleton = ({ label }: FormSkeletonProps) => {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-5">
      <Skeleton className="h-24" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
};
