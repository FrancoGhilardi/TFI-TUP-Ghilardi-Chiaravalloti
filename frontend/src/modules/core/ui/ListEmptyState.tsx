import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

interface ListEmptyStateProps {
  icon: LucideIcon;
  /** Something narrows the list, so a different search or no filters may bring records. */
  filtered: boolean;
  onClear: () => void;
  text: {
    filteredTitle: string;
    filteredText: string;
    noneTitle: string;
    noneText: string;
    clear: string;
  };
  /** The link that starts the first record, when the list is empty without filters. */
  create: { label: string; href: string };
}

/** What a panel list shows when it has no rows: how to widen the search, or how to start. */
export const ListEmptyState = ({ icon, filtered, onClear, text, create }: ListEmptyStateProps) => {
  return (
    <div className="p-4">
      <StatusMessage
        icon={icon}
        title={filtered ? text.filteredTitle : text.noneTitle}
        description={filtered ? text.filteredText : text.noneText}
        actions={
          filtered ? (
            <Button type="button" variant="outline" onClick={onClear}>
              {text.clear}
            </Button>
          ) : (
            <Button asChild>
              <Link href={create.href}>{create.label}</Link>
            </Button>
          )
        }
      />
    </div>
  );
};
