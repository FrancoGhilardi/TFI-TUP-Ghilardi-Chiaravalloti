import { Controller, useFormContext } from "react-hook-form";

import { StateRadioField } from "@/modules/core/ui/StateRadioField";
import { TextField } from "@/modules/core/ui/TextField";

import { productFormText } from "../content/product-form";
import type { ProductFormValues } from "../domain/product-form";
import { FormSection } from "@/modules/core/ui/FormSection";
import { NewMarkFields } from "./NewMarkFields";
import { OfferFields } from "./OfferFields";
import { SwitchRow } from "./SwitchRow";

export const PublicationPanel = () => {
  const { control, register, formState } = useFormContext<ProductFormValues>();
  const {
    title,
    state,
    active,
    inactive,
    stateHint,
    featured,
    sale,
    new: mark,
  } = productFormText.publication;
  const { sortOrder } = productFormText.fields;

  return (
    <FormSection title={title}>
      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <StateRadioField
            id="product-state"
            label={state}
            activeLabel={active}
            inactiveLabel={inactive}
            hint={stateHint}
            active={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="isFeatured"
        render={({ field }) => (
          <SwitchRow
            id="product-featured"
            label={featured.label}
            hint={featured.hint}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="isOnSale"
        render={({ field }) => (
          <SwitchRow
            id="product-on-sale"
            label={sale.label}
            hint={sale.hint}
            checked={field.value}
            onCheckedChange={field.onChange}
          >
            <OfferFields />
          </SwitchRow>
        )}
      />
      <Controller
        control={control}
        name="isNew"
        render={({ field }) => (
          <SwitchRow
            id="product-is-new"
            label={mark.label}
            hint={mark.hint}
            checked={field.value}
            onCheckedChange={field.onChange}
          >
            <NewMarkFields />
          </SwitchRow>
        )}
      />

      <TextField
        id="product-sort-order"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        label={sortOrder.label}
        hint={sortOrder.hint}
        error={formState.errors.sortOrder?.message}
        {...register("sortOrder")}
      />
    </FormSection>
  );
};
