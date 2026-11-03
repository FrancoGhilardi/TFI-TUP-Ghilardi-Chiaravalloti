import { AddToCart, CartSyncNotice } from "@/modules/cart";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";

import { productDetailContent } from "../content/product-detail";
import { hasRunningSale } from "../domain/product-card";
import { cartProductOf, type ProductDetail } from "../domain/product-detail";
import { ProductInquiryButton } from "./ProductInquiryButton";
import { ProductPrice } from "./ProductPrice";
import { SaleBadge } from "./SaleBadge";
import { StockPill } from "./StockPill";

interface ProductInfoProps {
  product: ProductDetail;
}

/** Everything about the product but its photos: name, price, stock, description and actions. */
export const ProductInfo = ({ product }: ProductInfoProps) => {
  const cartProduct = cartProductOf(product);
  return (
    <div className="flex flex-col items-start gap-5">
      <div>
        {product.category && <Eyebrow>{product.category.name}</Eyebrow>}
        <h1 className="mt-2 text-display font-semibold">{product.title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ProductPrice size="detail" {...product} />
        {hasRunningSale(product) && <SaleBadge />}
      </div>
      <StockPill stock={product.stock} />
      {product.description && (
        <p className="max-w-[60ch] leading-relaxed whitespace-pre-line text-ink-soft">
          {product.description}
        </p>
      )}
      <div className="flex w-full flex-col gap-3">
        <CartSyncNotice product={cartProduct} />
        <div className="flex flex-wrap items-start gap-3">
          <AddToCart product={cartProduct} />
          <ProductInquiryButton product={product} />
        </div>
      </div>
      <ul className="flex flex-col gap-2.5 border-t border-line-soft pt-5 text-[0.92rem] text-ink-soft">
        {productDetailContent.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
};
