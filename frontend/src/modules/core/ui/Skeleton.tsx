import type { ComponentProps } from "react";

import { cn } from "@/modules/core/lib/utils";

type SkeletonProps = ComponentProps<"div">;

/** A grey block where content will be, so the page does not jump when it arrives. */
export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-wheat", className)}
    />
  );
};
