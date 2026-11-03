import type { ReactNode } from "react";

import { getStoreRootCategories, StoreSearch } from "@/modules/catalog";
import { publicConfig } from "@/modules/core/config/env";
import { SkipLink } from "@/modules/core/ui/SkipLink";
import { generalInquiryUrl } from "@/modules/whatsapp";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { StoreCartButton } from "./StoreCartButton";

const MAIN_CONTENT_ID = "contenido";

interface StoreShellProps {
  children: ReactNode;
}

/** Header, content and footer shared by every public page. */
export const StoreShell = async ({ children }: StoreShellProps) => {
  const categories = await getStoreRootCategories();
  const whatsappUrl = generalInquiryUrl(publicConfig.whatsappNumber);

  return (
    <>
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <SiteHeader
        categories={categories}
        whatsappUrl={whatsappUrl}
        search={<StoreSearch />}
        cart={<StoreCartButton />}
      />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter categories={categories} whatsappUrl={whatsappUrl} />
    </>
  );
};
