/**
 * Column layouts of the product grid and the matching image widths, so `next/image` picks a
 * source the size of a card: the home shows 5 per row, the catalog 4 next to its categories.
 */
export const PRODUCT_GRID_LAYOUTS = {
  home: {
    columns: "grid-cols-2 min-[681px]:grid-cols-3 lg:grid-cols-5",
    imageSizes: "(min-width: 1024px) 236px, (min-width: 681px) 33vw, 50vw",
  },
  catalog: {
    columns: "grid-cols-2 min-[681px]:grid-cols-3 lg:grid-cols-4",
    // From the `nav` breakpoint (861px) the categories sidebar takes about 300px of the width.
    imageSizes:
      "(min-width: 1024px) 220px, (min-width: 861px) calc((100vw - 300px) / 3), (min-width: 681px) 33vw, 50vw",
  },
} as const;

export type ProductGridLayout = keyof typeof PRODUCT_GRID_LAYOUTS;
