import type { ComponentProps } from "react";

import { cn } from "@/modules/core/lib/utils";

type ContainerProps = ComponentProps<"div">;

/** Centers content at the site width with the side gutters every section shares. */
export const Container = ({ className, ...props }: ContainerProps) => {
  return <div className={cn("mx-auto w-full max-w-site px-4 sm:px-6", className)} {...props} />;
};
