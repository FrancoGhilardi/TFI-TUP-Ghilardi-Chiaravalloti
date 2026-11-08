"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

import { useProductsQuery } from "../application/useProductsQuery";
import { productsContent } from "../content/products";
import { PRODUCTS_PATH } from "../domain/products-query";
import { ProductsResults } from "./ProductsResults";
import { ProductsToolbar } from "./ProductsToolbar";

/** The panel's list of products: search, filters, sort, pages and the logical delete. */
export const ProductsPage = () => {
  const { query, go } = useProductsQuery();
  const { eyebrow, title, lead, newProduct } = productsContent;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1.5 text-[1.9rem] font-semibold">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-ink-soft">{lead}</p>
        </div>
        <Button asChild>
          <Link href={`${PRODUCTS_PATH}/nuevo`}>
            <Plus aria-hidden="true" />
            {newProduct}
          </Link>
        </Button>
      </header>
      <section
        aria-label={title}
        className="rounded-card border border-line-soft bg-surface shadow-sm"
      >
        <ProductsToolbar query={query} go={go} />
        <ProductsResults query={query} go={go} />
      </section>
    </div>
  );
};
