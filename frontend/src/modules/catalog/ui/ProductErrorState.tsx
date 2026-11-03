"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";

import { Container } from "@/modules/core/ui/Container";
import { Button } from "@/modules/core/ui/primitives/button";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";

import { productDetailContent } from "../content/product-detail";
import { CATALOG_PATH } from "../domain/product-routes";

interface ProductErrorStateProps {
  /** Renders the page again, as Next gives it to an error boundary. */
  reset: () => void;
}

/** Shown when the product could not be read for a reason other than not existing. */
export const ProductErrorState = ({ reset }: ProductErrorStateProps) => {
  const { error } = productDetailContent;
  return (
    <Container className="py-16">
      <StatusMessage
        role="alert"
        icon={CloudOff}
        title={error.title}
        description={error.body}
        actions={
          <>
            <Button type="button" onClick={reset}>
              {error.retry}
            </Button>
            <Button asChild variant="outline">
              <Link href={CATALOG_PATH}>{error.action}</Link>
            </Button>
          </>
        }
      />
    </Container>
  );
};
