import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { ROW_ACTION_CLASS, ROW_ACTION_ICON_CLASS } from "./row-action-styles";

interface RowActionButtonProps extends Omit<ComponentProps<"button">, "children" | "className"> {
  icon: LucideIcon;
  /** Names the action for assistive technology and for the hover title. */
  label: string;
}

/**
 * An icon button in a list row. Inside a `ConfirmDialog` it is the control that opens it, so the
 * props and the ref the dialog hands it reach the button.
 */
export const RowActionButton = ({ icon: Icon, label, ...props }: RowActionButtonProps) => {
  return (
    <button type="button" aria-label={label} title={label} {...props} className={ROW_ACTION_CLASS}>
      <Icon className={ROW_ACTION_ICON_CLASS} aria-hidden="true" />
    </button>
  );
};
