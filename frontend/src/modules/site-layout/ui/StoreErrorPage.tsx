"use client";

import { publicConfig } from "@/modules/core/config/env";
import { ErrorPage } from "@/modules/core/ui/ErrorPage";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { generalInquiryUrl } from "@/modules/whatsapp";

import { storeSystemPagesContent as content } from "../content/system-pages";

interface StoreErrorPageProps {
  /** Reads and renders the page again, as Next gives it to an error boundary. */
  retry: () => void;
  digest?: string;
}

/** What a failed page of the store shows, with a way to ask by WhatsApp, which is how it sells. */
export const StoreErrorPage = ({ retry, digest }: StoreErrorPageProps) => {
  return (
    <ErrorPage retry={retry} digest={digest} homeHref="/" homeLabel={content.home}>
      <Button asChild variant="outline">
        <ExternalLink href={generalInquiryUrl(publicConfig.whatsappNumber)}>
          <WhatsAppIcon />
          {content.whatsapp}
        </ExternalLink>
      </Button>
    </ErrorPage>
  );
};
