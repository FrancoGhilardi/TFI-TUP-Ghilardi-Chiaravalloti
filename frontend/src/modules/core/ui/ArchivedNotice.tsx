import { Archive } from "lucide-react";

import { Button } from "@/modules/core/ui/primitives/button";

interface ArchivedNoticeProps {
  /** Why it cannot be edited. */
  message: string;
  /** The way to bring it back, such as "Reactivar". */
  actionLabel: string;
  /** The request to bring it back is on its way. */
  pending: boolean;
  onAction: () => void;
}

/** Above a form of something deleted: it is read-only until it is restored. */
export const ArchivedNotice = ({
  message,
  actionLabel,
  pending,
  onAction,
}: ArchivedNoticeProps) => {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-sm text-ink"
    >
      <Archive className="size-4 shrink-0 text-coral-strong" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      <Button type="button" size="sm" disabled={pending} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
};
