import type { Metadata } from "next";

import { getProductMetadata, ProductDetailPage } from "@/modules/catalog";

// Pages are built on the first visit and kept for a minute; none is built ahead, so `next build`
// never needs the API.
export const revalidate = 60;
export const generateStaticParams = () => [];

export const generateMetadata = async ({
  params,
}: PageProps<"/productos/[slug]">): Promise<Metadata> => {
  const { slug } = await params;
  return getProductMetadata(slug);
};

const ProductPage = async ({ params }: PageProps<"/productos/[slug]">) => {
  const { slug } = await params;
  return <ProductDetailPage slug={slug} />;
};

export default ProductPage;
