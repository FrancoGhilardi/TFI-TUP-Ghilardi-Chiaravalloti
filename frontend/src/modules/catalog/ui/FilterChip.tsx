import { X } from "lucide-react";
import Link from "next/link";

import { catalogContent } from "../content/catalog";

interface FilterChipProps {
  label: string;
  /** Catalog URL without this filter. */
  removeHref: string;
}

/** An active filter; following it removes the filter. */
export const FilterChip = ({ label, removeHref }: FilterChipProps) => {
  return (
    <Link
      href={removeHref}
      aria-label={catalogContent.filters.remove(label)}
      className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft py-1 pr-2 pl-3 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
    >
      {label}
      <X className="size-3.5" aria-hidden="true" />
    </Link>
  );
};
