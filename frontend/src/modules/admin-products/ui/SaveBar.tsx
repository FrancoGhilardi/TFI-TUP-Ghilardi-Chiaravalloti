import { FormSaveBar } from "@/modules/core/ui/FormSaveBar";

import { productFormText } from "../content/product-form";
import { PRODUCTS_PATH } from "../domain/products-query";

interface SaveBarProps {
  editing: boolean;
  changed: boolean;
  canSave: boolean;
  saving: boolean;
}

/** What to do with the product's form: see its state, leave it, or save it. */
export const SaveBar = ({ editing, changed, canSave, saving }: SaveBarProps) => {
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
    <FormSaveBar
      message={message}
      changed={changed}
      canSave={canSave}
      saving={saving}
      submitLabel={editing ? saveLabel : createLabel}
      savingLabel={savingLabel}
      cancelLabel={cancel}
      leaveHref={PRODUCTS_PATH}
      leave={leave}
    />
  );
};
