import { Controller, useFormContext } from "react-hook-form";

import { TextField } from "@/modules/core/ui/TextField";
import { Label } from "@/modules/core/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/modules/core/ui/primitives/radio-group";

import { productFormText } from "../content/product-form";
import type { ProductFormValues } from "../domain/product-form";
import { FormSection } from "./FormSection";
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
      <div className="flex flex-col gap-2">
        <span id="product-state-label" className="text-sm font-semibold text-ink">
          {state}
        </span>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <RadioGroup
              aria-labelledby="product-state-label"
              value={field.value ? "active" : "inactive"}
              onValueChange={(value) => field.onChange(value === "active")}
              className="grid-cols-2"
            >
              {[
                { value: "active", label: active },
                { value: "inactive", label: inactive },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-2 rounded-xl border-[1.5px] border-line px-3 py-2"
                >
                  <RadioGroupItem value={option.value} id={`product-state-${option.value}`} />
                  <Label htmlFor={`product-state-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        <p className="text-sm text-ink-soft">{stateHint}</p>
      </div>

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
