import Link from "next/link";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { Button } from "@/modules/core/ui/primitives/button";

import { productFormText } from "../content/product-form";
import { PRODUCTS_PATH } from "../domain/products-query";

interface SaveBarProps {
  editing: boolean;
  changed: boolean;
  canSave: boolean;
  saving: boolean;
}

/** What to do with the form: say what state it is in, leave it, or save it. */
export const SaveBar = ({ editing, changed, canSave, saving }: SaveBarProps) => {
  const router = useRouter();
  const {
    create,
    dirty,
    clean,
    cancel,
    createLabel,
    saveLabel,
    saving: savingLabel,
    leave,
  } = productFormText.saveBar;
  let message: string = create;
  if (editing) {
    message = changed ? dirty : clean;
  }

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
          onConfirm={() => router.push(PRODUCTS_PATH)}
        >
          <Button type="button" variant="outline">
            {cancel}
          </Button>
        </ConfirmDialog>
      ) : (
        <Button asChild variant="outline">
          <Link href={PRODUCTS_PATH}>{cancel}</Link>
        </Button>
      )}
      <Button type="submit" disabled={!canSave || saving}>
        {saving ? savingLabel : editing ? saveLabel : createLabel}
      </Button>
    </div>
  );
};
