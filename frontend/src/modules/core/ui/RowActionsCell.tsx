import type { ReactNode } from "react";

interface RowActionsCellProps {
  children: ReactNode;
}

/** The last cell of a list row, with its actions. It closes the card on small screens. */
export const RowActionsCell = ({ children }: RowActionsCellProps) => {
  return (
    <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pb-0">{children}</td>
  );
};
