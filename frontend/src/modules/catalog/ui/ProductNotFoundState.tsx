import { PackageSearch } from "lucide-react";
import Link from "next/link";

import { PageState } from "@/modules/core/ui/PageState";
import { Button } from "@/modules/core/ui/primitives/button";

import { productDetailContent } from "../content/product-detail";
import { CATALOG_PATH } from "../domain/product-routes";

/** Shown for a product that does not exist or is not for sale. */
export const ProductNotFoundState = () => {
  const { notFound } = productDetailContent;
  return (
    <PageState
      noIndex
      icon={PackageSearch}
      title={notFound.title}
      description={notFound.body}
      actions={
        <Button asChild>
          <Link href={CATALOG_PATH}>{notFound.action}</Link>
        </Button>
      }
    />
  );
};
