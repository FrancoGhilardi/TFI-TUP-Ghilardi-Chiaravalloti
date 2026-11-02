import {
  Backpack,
  BookOpen,
  Gift,
  type LucideIcon,
  NotebookPen,
  Palette,
  PencilRuler,
  Tag,
} from "lucide-react";

import { type CategoryIconKey, categoryIconKey } from "../domain/category-icons";

const ICONS: Record<CategoryIconKey, LucideIcon> = {
  books: BookOpen,
  school: PencilRuler,
  notebooks: NotebookPen,
  art: Palette,
  backpacks: Backpack,
  gifts: Gift,
  generic: Tag,
};

interface CategoryIconProps {
  slug: string;
  className?: string;
}

/** Decorative: the category name always sits beside it. */
export const CategoryIcon = ({ slug, className }: CategoryIconProps) => {
  const Icon = ICONS[categoryIconKey(slug)];
  return <Icon aria-hidden="true" className={className} />;
};
