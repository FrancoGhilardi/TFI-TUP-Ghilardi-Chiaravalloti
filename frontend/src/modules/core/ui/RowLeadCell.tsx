import type { ReactNode } from "react";

interface RowLeadCellProps {
  children: ReactNode;
}

/** The first cell of a list row: what the record is. It heads the card on small screens. */
export const RowLeadCell = ({ children }: RowLeadCellProps) => {
  return (
    <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pt-0">{children}</td>
  );
};
