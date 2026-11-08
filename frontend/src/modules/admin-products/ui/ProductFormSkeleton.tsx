import { productFormText } from "../content/product-form";

/** Grey blocks where the form will be, so the page does not jump when the product arrives. */
export const ProductFormSkeleton = () => {
  return (
    <div aria-busy="true" aria-label={productFormText.loading} className="flex flex-col gap-5">
      <div className="h-24 animate-pulse rounded-xl bg-wheat" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="h-96 animate-pulse rounded-xl bg-wheat" />
        <div className="h-96 animate-pulse rounded-xl bg-wheat" />
      </div>
    </div>
  );
};
