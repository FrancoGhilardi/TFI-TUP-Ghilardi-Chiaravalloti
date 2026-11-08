import { PackageSearch } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { productFormText } from "../content/product-form";
import { PRODUCTS_PATH } from "../domain/products-query";

export const ProductNotFound = () => {
  const { title, text, action } = productFormText.notFound;
  return (
    <StatusMessage
      icon={PackageSearch}
      title={title}
      description={text}
      actions={
        <Button asChild>
          <Link href={PRODUCTS_PATH}>{action}</Link>
        </Button>
      }
    />
  );
};
