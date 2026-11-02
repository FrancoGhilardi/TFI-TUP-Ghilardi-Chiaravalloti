import { SearchX } from "lucide-react";
import Link from "next/link";

import { publicConfig } from "@/modules/core/config/env";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { generalInquiryUrl } from "@/modules/whatsapp";

import { catalogContent } from "../content/catalog";
import { CATALOG_PATH } from "../domain/product-routes";

interface CatalogEmptyStateProps {
  /** What was searched, to say it back. */
  search?: string;
}

export const CatalogEmptyState = ({ search }: CatalogEmptyStateProps) => {
  const { empty } = catalogContent;
  return (
    <StatusMessage
      icon={SearchX}
      title={search ? empty.forSearch(search) : empty.title}
      description={empty.body}
      actions={
        <>
          <Button asChild>
            <Link href={CATALOG_PATH}>{empty.showAll}</Link>
          </Button>
          <Button asChild variant="outline">
            <ExternalLink href={generalInquiryUrl(publicConfig.whatsappNumber)}>
              <WhatsAppIcon />
              {empty.ask}
            </ExternalLink>
          </Button>
        </>
      }
    />
  );
};
