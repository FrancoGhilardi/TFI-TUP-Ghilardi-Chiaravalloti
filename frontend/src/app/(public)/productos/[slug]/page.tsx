import { ProductDetailPage } from "@/modules/catalog";

// Pages are built on the first visit and kept for a minute; none is built ahead, so `next build`
// never needs the API.
export const revalidate = 60;
export const generateStaticParams = () => [];

const ProductPage = async ({ params }: PageProps<"/productos/[slug]">) => {
  const { slug } = await params;
  return <ProductDetailPage slug={slug} />;
};

export default ProductPage;
