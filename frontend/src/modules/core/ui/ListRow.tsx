import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

interface ListRowProps {
  /** A record that was given a logical delete is shown muted. */
  deleted: boolean;
  children: ReactNode;
}

/** A row of a list table; below the medium width it is a card. */
export const ListRow = ({ deleted, children }: ListRowProps) => {
  return (
    <tr
      className={cn(
        "border-t border-line-soft max-md:block max-md:rounded-card max-md:border max-md:p-4",
        deleted && "bg-wheat/40 text-ink-soft",
      )}
    >
      {children}
    </tr>
  );
};
