import { CategoryGrid, type CategoryNode } from "@/modules/catalog";
import { SectionHeading } from "@/modules/core/ui/SectionHeading";

const HEADING_ID = "por-categoria";

interface CategoryShowcaseProps {
  categories: CategoryNode[];
}

/** The first-level categories as tiles; nothing at all when there are none. */
export const CategoryShowcase = ({ categories }: CategoryShowcaseProps) => {
  if (categories.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionHeading id={HEADING_ID} eyebrow="Explorá" title="Por categoría" />
      <CategoryGrid categories={categories} />
    </section>
  );
};
