import { X } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/modules/core/ui/primitives/radio-group";

import { productPickersText } from "../content/product-form";

export interface ChosenCategory {
  id: string;
  name: string;
}

interface ChosenCategoriesProps {
  categories: ChosenCategory[];
  primaryId: string;
  onPrimary: (id: string) => void;
  onRemove: (id: string) => void;
}

/** The categories picked, with the one that is the primary and a way to take each off. */
export const ChosenCategories = ({
  categories,
  primaryId,
  onPrimary,
  onRemove,
}: ChosenCategoriesProps) => {
  const { chosen, primary, primaryOf, remove, none } = productPickersText.categories;

  if (categories.length === 0) {
    return <p className="text-sm text-ink-soft">{none}</p>;
  }
  return (
    <RadioGroup aria-label={chosen} value={primaryId} onValueChange={onPrimary} className="gap-2">
      {categories.map(({ id, name }) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-xl border border-line-soft px-3 py-2"
        >
          <RadioGroupItem value={id} id={`primary-${id}`} aria-label={primaryOf(name)} />
          <label htmlFor={`primary-${id}`} className="flex-1 text-sm font-semibold">
            {name}
            {id === primaryId && (
              <span className="ml-2 rounded-full bg-teal-soft px-2 py-0.5 text-xs text-teal-deep">
                {primary}
              </span>
            )}
          </label>
          <button
            type="button"
            aria-label={remove(name)}
            title={remove(name)}
            onClick={() => onRemove(id)}
            className="grid size-8 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </RadioGroup>
  );
};
