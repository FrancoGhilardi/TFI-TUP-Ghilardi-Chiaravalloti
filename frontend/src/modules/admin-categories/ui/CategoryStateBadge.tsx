import { cn } from "@/modules/core/lib/utils";

import { categoriesContent } from "../content/categories";
import type { CategoryState } from "../domain/category-state";

const STYLES: Record<CategoryState, string> = {
  active: "bg-teal-soft text-teal-deep",
  inactive: "bg-wheat text-ink-soft",
  deleted: "bg-coral-soft text-coral-strong",
};

interface CategoryStateBadgeProps {
  state: CategoryState;
}

export const CategoryStateBadge = ({ state }: CategoryStateBadgeProps) => {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STYLES[state])}>
      {categoriesContent.table.states[state]}
    </span>
  );
};
