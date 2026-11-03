import type { Metadata } from "next";

import { CatalogPage, getCatalogMetadata } from "@/modules/catalog";

export const generateMetadata = async ({
  searchParams,
}: PageProps<"/productos">): Promise<Metadata> => {
  return getCatalogMetadata(await searchParams);
};

const ProductsPage = async ({ searchParams }: PageProps<"/productos">) => {
  return <CatalogPage searchParams={await searchParams} />;
};

export default ProductsPage;
