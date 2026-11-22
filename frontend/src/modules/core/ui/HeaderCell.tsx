import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

interface HeaderCellProps {
  children: ReactNode;
  numeric?: boolean;
}

/** A column title of a list table. */
export const HeaderCell = ({ children, numeric }: HeaderCellProps) => {
  return (
    <th
      scope="col"
      className={cn("px-3 py-3 font-semibold text-ink-soft", numeric ? "text-right" : "text-left")}
    >
      {children}
    </th>
  );
};
