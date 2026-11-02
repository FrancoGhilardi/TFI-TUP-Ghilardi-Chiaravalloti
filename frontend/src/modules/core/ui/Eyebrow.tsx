import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/** Small spaced capitals above a heading. */
export const Eyebrow = ({ children, className }: EyebrowProps) => {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[0.74rem] font-bold tracking-[0.16em] text-teal uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
};
