import type { LucideIcon } from "lucide-react";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { RowActionButton } from "@/modules/core/ui/RowActionButton";

interface ConfirmRowActionProps {
  icon: LucideIcon;
  label: string;
  dialog: { title: string; description: string; confirm: string };
  onConfirm: () => void;
  /** A request for this record is on its way. */
  pending: boolean;
}

/** An icon button in a list row that asks before it acts. */
export const ConfirmRowAction = ({
  icon,
  label,
  dialog,
  onConfirm,
  pending,
}: ConfirmRowActionProps) => {
  return (
    <ConfirmDialog
      title={dialog.title}
      description={dialog.description}
      confirmLabel={dialog.confirm}
      onConfirm={onConfirm}
      disabled={pending}
    >
      <RowActionButton icon={icon} label={label} disabled={pending} />
    </ConfirmDialog>
  );
};
