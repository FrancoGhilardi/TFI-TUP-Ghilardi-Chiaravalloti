import { CatalogPage } from "@/modules/catalog";

const ProductsPage = async ({ searchParams }: PageProps<"/productos">) => {
  return <CatalogPage searchParams={await searchParams} />;
};

export default ProductsPage;
