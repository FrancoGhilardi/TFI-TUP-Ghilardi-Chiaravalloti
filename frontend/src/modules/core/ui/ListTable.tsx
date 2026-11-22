import type { ReactNode } from "react";

interface ListTableProps {
  caption: string;
  /** The header cells. */
  head: ReactNode;
  /** The rows. */
  children: ReactNode;
}

/** A table from the medium width; below it every row is a card with the same information. */
export const ListTable = ({ caption, head, children }: ListTableProps) => {
  return (
    <table className="w-full text-sm max-md:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr className="text-xs tracking-wide uppercase">{head}</tr>
      </thead>
      <tbody className="max-md:block max-md:space-y-3 max-md:p-3">{children}</tbody>
    </table>
  );
};
