import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CATALOG_PATH } from "@/modules/catalog";
import { publicConfig } from "@/modules/core/config/env";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { generalInquiryUrl } from "@/modules/whatsapp";

import { heroContent } from "../content/hero";

/** The hero's two ways forward: browse the catalog or ask the store on WhatsApp. */
export const HeroActions = () => {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3 nav:justify-start">
      <Button asChild>
        <Link href={CATALOG_PATH}>
          {heroContent.catalogCta}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="outline">
        <ExternalLink href={generalInquiryUrl(publicConfig.whatsappNumber)}>
          <WhatsAppIcon />
          {heroContent.inquiryCta}
        </ExternalLink>
      </Button>
    </div>
  );
};
