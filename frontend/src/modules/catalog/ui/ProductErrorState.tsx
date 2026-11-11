"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";

import { PageState } from "@/modules/core/ui/PageState";
import { Button } from "@/modules/core/ui/primitives/button";

import { productDetailContent } from "../content/product-detail";
import { CATALOG_PATH } from "../domain/product-routes";

interface ProductErrorStateProps {
  /** Reads and renders the page again, as Next gives it to an error boundary. */
  retry: () => void;
  /** The identifier Next gives to the failure, to match it with the server's logs. */
  digest?: string;
}

/** Shown when the product could not be read for a reason other than not existing. */
export const ProductErrorState = ({ retry, digest }: ProductErrorStateProps) => {
  const { error } = productDetailContent;
  return (
    <PageState
      noIndex
      role="alert"
      icon={CloudOff}
      title={error.title}
      description={error.body}
      reference={digest}
      actions={
        <>
          <Button type="button" onClick={retry}>
            {error.retry}
          </Button>
          <Button asChild variant="outline">
            <Link href={CATALOG_PATH}>{error.action}</Link>
          </Button>
        </>
      }
    />
  );
};
