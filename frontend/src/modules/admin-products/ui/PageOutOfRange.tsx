import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { productsContent } from "../content/products";
import { type ProductsQuery, productsHref } from "../domain/products-query";

interface PageOutOfRangeProps {
  query: ProductsQuery;
}

/** The page asked for is past the last one: the filters may have left fewer pages than before. */
export const PageOutOfRange = ({ query }: PageOutOfRangeProps) => {
  const { title, text, action } = productsContent.outOfRange;
  return (
    <div className="p-4">
      <StatusMessage
        icon={FileQuestion}
        title={title}
        description={text}
        actions={
          <Button asChild>
            <Link href={productsHref(query, { page: 1 })}>{action}</Link>
          </Button>
        }
      />
    </div>
  );
};
