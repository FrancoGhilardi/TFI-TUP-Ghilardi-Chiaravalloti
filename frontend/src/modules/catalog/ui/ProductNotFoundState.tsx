import { PackageSearch } from "lucide-react";
import Link from "next/link";

import { Container } from "@/modules/core/ui/Container";
import { Button } from "@/modules/core/ui/primitives/button";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";

import { productDetailContent } from "../content/product-detail";
import { CATALOG_PATH } from "../domain/product-routes";

/** Shown for a product that does not exist or is not for sale. */
export const ProductNotFoundState = () => {
  const { notFound } = productDetailContent;
  return (
    <Container className="py-16">
      <StatusMessage
        icon={PackageSearch}
        title={notFound.title}
        description={notFound.body}
        actions={
          <Button asChild>
            <Link href={CATALOG_PATH}>{notFound.action}</Link>
          </Button>
        }
      />
    </Container>
  );
};
