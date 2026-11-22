import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

interface RowCellProps {
  /** The column title, shown beside the value when the row is a card. */
  label: string;
  numeric?: boolean;
  children: ReactNode;
}

/** A data cell of a list row. */
export const RowCell = ({ label, numeric, children }: RowCellProps) => {
  return (
    <td
      data-label={label}
      className={cn(
        "px-3 py-3 align-middle max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-xs max-md:before:font-semibold max-md:before:text-ink-soft max-md:before:content-[attr(data-label)]",
        numeric && "md:text-right md:tabular-nums",
      )}
    >
      {children}
    </td>
  );
};
