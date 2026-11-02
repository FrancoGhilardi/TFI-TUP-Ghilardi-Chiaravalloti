import type { CategoryNode } from "../domain/category";
import { CategoryTile } from "./CategoryTile";

interface CategoryGridProps {
  categories: CategoryNode[];
}

export const CategoryGrid = ({ categories }: CategoryGridProps) => {
  return (
    <ul className="grid grid-cols-2 gap-3.5 min-[521px]:grid-cols-3 min-[901px]:grid-cols-6">
      {categories.map((category) => (
        <li key={category.id}>
          <CategoryTile category={category} />
        </li>
      ))}
    </ul>
  );
};
