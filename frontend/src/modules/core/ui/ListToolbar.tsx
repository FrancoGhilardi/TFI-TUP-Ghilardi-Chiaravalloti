import type { ReactNode } from "react";

import { SEARCH_MAX_LENGTH } from "@/modules/core/lib/list-query";
import { SearchField } from "@/modules/core/ui/SearchField";
import { Button } from "@/modules/core/ui/primitives/button";

interface ListToolbarProps {
  search: {
    id: string;
    label: string;
    placeholder: string;
    /** The search text in the address; empty when there is none. */
    value: string;
    onSearch: (text: string) => void;
  };
  /** The filters, beside the search. */
  children?: ReactNode;
  /** Takes away every search and filter; beside them. Shown only when something narrows the list. */
  clear?: { label: string; onClear: () => void } | false;
  /** A second row under the search and the filters. */
  extra?: ReactNode;
}

/** The bar over a panel list: its search, its filters and the way to take them all away. */
export const ListToolbar = ({ search, children, clear, extra }: ListToolbarProps) => {
  return (
    <div className="flex flex-col gap-3 border-b border-line-soft p-4">
      <div className="flex flex-wrap gap-3">
        <SearchField {...search} maxLength={SEARCH_MAX_LENGTH} />
        {children}
        {clear && (
          <Button type="button" variant="ghost" onClick={clear.onClear}>
            {clear.label}
          </Button>
        )}
      </div>
      {extra}
    </div>
  );
};
