import Link from "next/link";

import { CATALOG_PATH } from "@/modules/catalog";
import { NotFoundPage } from "@/modules/core/ui/NotFoundPage";
import { Button } from "@/modules/core/ui/primitives/button";

import { storeSystemPagesContent as content } from "../content/system-pages";

/** The store's page for an address that leads nowhere. */
export const StoreNotFound = () => {
  return (
    <NotFoundPage homeHref="/" homeLabel={content.home}>
      <Button asChild variant="outline">
        <Link href={CATALOG_PATH}>{content.products}</Link>
      </Button>
    </NotFoundPage>
  );
};
