interface ActionsHeaderCellProps {
  label: string;
}

/** The last column title of a list table: the row actions, named only for assistive technology. */
export const ActionsHeaderCell = ({ label }: ActionsHeaderCellProps) => {
  return (
    <th scope="col" className="px-3 py-3">
      <span className="sr-only">{label}</span>
    </th>
  );
};
