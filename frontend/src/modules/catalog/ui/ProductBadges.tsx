import { cva } from "class-variance-authority";

import { hasRunningSale, type ProductCard } from "../domain/product-card";

const badgeStyles = cva(
  "inline-flex rounded-full px-2.5 py-1 text-[0.66rem] font-bold tracking-[0.04em] uppercase",
  {
    variants: {
      kind: {
        featured: "bg-gold text-ink",
        new: "bg-teal text-white",
        sale: "bg-coral-strong text-white",
      },
    },
  },
);

type ProductBadgesProps = Pick<ProductCard, "isFeatured" | "isNew" | "isOnSale" | "salePrice">;

export const ProductBadges = ({ isFeatured, isNew, ...pricing }: ProductBadgesProps) => {
  const badges = [
    isFeatured && { kind: "featured" as const, label: "Destacado" },
    isNew && { kind: "new" as const, label: "Nuevo" },
    // Same rule as the price, so the badge never announces a sale the price does not show.
    hasRunningSale(pricing) && { kind: "sale" as const, label: "Oferta" },
  ].filter((badge) => badge !== false);

  if (badges.length === 0) {
    return null;
  }
  return (
    <ul className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
      {badges.map(({ kind, label }) => (
        <li key={kind} className={badgeStyles({ kind })}>
          {label}
        </li>
      ))}
    </ul>
  );
};
