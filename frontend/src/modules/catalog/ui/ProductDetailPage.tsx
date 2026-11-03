import { notFound } from "next/navigation";

import { Breadcrumb } from "@/modules/core/ui/Breadcrumb";
import { Container } from "@/modules/core/ui/Container";

import { getProductPage } from "../application/get-product-page";
import { productDetailContent } from "../content/product-detail";
import { productBreadcrumb } from "../domain/product-breadcrumb";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";
import { RelatedProducts } from "./RelatedProducts";

interface ProductDetailPageProps {
  slug: string;
}

export const ProductDetailPage = async ({ slug }: ProductDetailPageProps) => {
  const result = await getProductPage(slug);
  if (result.status === "not-found") {
    notFound();
  }
  const { product } = result;

  return (
    <Container className="flex flex-col gap-14 py-8">
      <div className="flex flex-col gap-5">
        <Breadcrumb
          label={productDetailContent.breadcrumb.label}
          items={productBreadcrumb(product)}
        />
        <div className="grid items-start gap-8 nav:grid-cols-2 nav:gap-12">
          {/* Keyed by product: going to a similar one must not keep the photo or quantity picked. */}
          <ProductGallery key={`gallery-${product.id}`} images={product.images} />
          <ProductInfo key={`info-${product.id}`} product={product} />
        </div>
      </div>
      <RelatedProducts products={product.related} />
    </Container>
  );
};
