import type { LucideIcon } from "lucide-react";
import { useId } from "react";

import { ROW_ACTION_CLASS, ROW_ACTION_ICON_CLASS } from "./row-action-styles";

interface BlockedRowActionProps {
  icon: LucideIcon;
  label: string;
  /** Why the action is not available. */
  reason: string;
}

/** A disabled icon button in a list row that says why. */
export const BlockedRowAction = ({ icon: Icon, label, reason }: BlockedRowActionProps) => {
  const reasonId = useId();

  return (
    <>
      {/* The title only shows on hover; the description reaches screen readers too. */}
      <button
        type="button"
        aria-label={label}
        aria-describedby={reasonId}
        title={reason}
        disabled
        className={ROW_ACTION_CLASS}
      >
        <Icon className={ROW_ACTION_ICON_CLASS} aria-hidden="true" />
      </button>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
};
