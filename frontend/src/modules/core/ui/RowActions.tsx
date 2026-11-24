import type { ReactNode } from "react";

interface RowActionsProps {
  children: ReactNode;
}

/** The icon buttons at the end of a list row. */
export const RowActions = ({ children }: RowActionsProps) => {
  return <span className="flex items-center justify-end gap-1">{children}</span>;
};
