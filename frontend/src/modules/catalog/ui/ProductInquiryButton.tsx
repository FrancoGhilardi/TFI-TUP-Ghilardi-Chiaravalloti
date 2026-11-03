import { publicConfig } from "@/modules/core/config/env";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { productInquiryUrl } from "@/modules/whatsapp";

import { productDetailContent } from "../content/product-detail";
import { currentPrice } from "../domain/product-card";
import { type ProductDetail, productPageUrl } from "../domain/product-detail";

interface ProductInquiryButtonProps {
  product: ProductDetail;
}

/** Opens a WhatsApp chat about this product, naming it, its price and where to see it. */
export const ProductInquiryButton = ({ product }: ProductInquiryButtonProps) => {
  const href = productInquiryUrl(publicConfig.whatsappNumber, {
    title: product.title,
    price: currentPrice(product),
    href: productPageUrl(publicConfig.siteOrigin, product.slug),
  });
  return (
    <Button asChild variant="whatsapp" className="h-11 px-6">
      <ExternalLink href={href}>
        <WhatsAppIcon />
        {productDetailContent.inquiry}
      </ExternalLink>
    </Button>
  );
};
