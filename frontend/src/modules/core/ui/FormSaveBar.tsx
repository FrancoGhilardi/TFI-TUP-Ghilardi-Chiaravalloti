import Link from "next/link";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { Button } from "@/modules/core/ui/primitives/button";

interface FormSaveBarProps {
  /** Says what state the form is in. */
  message: string;
  /** There are unsaved changes: leaving asks first. */
  changed: boolean;
  canSave: boolean;
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  cancelLabel: string;
  /** Where "Cancelar" goes. */
  leaveHref: string;
  leave: { title: string; description: string; confirm: string; keep: string };
}

/** What to do with a form: see what state it is in, leave it (asking if it has changes), or save it. */
export const FormSaveBar = ({
  message,
  changed,
  canSave,
  saving,
  submitLabel,
  savingLabel,
  cancelLabel,
  leaveHref,
  leave,
}: FormSaveBarProps) => {
  const router = useRouter();

  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line-soft bg-cream/95 px-4 py-3 backdrop-blur lg:-mx-7 lg:px-7">
      <p role="status" className="mr-auto text-sm text-ink-soft">
        {message}
      </p>
      {changed ? (
        <ConfirmDialog
          title={leave.title}
          description={leave.description}
          confirmLabel={leave.confirm}
          cancelLabel={leave.keep}
          onConfirm={() => router.push(leaveHref)}
        >
          <Button type="button" variant="outline">
            {cancelLabel}
          </Button>
        </ConfirmDialog>
      ) : (
        <Button asChild variant="outline">
          <Link href={leaveHref}>{cancelLabel}</Link>
        </Button>
      )}
      <Button type="submit" disabled={!canSave || saving}>
        {saving ? savingLabel : submitLabel}
      </Button>
    </div>
  );
};
