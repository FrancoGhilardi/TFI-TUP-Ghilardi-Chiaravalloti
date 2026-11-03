import type { ComponentProps } from "react";

import { publicConfig } from "@/modules/core/config/env";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { generalInquiryUrl } from "@/modules/whatsapp";

interface InquiryButtonProps {
  label: string;
  variant?: ComponentProps<typeof Button>["variant"];
}

/** Opens a WhatsApp chat with the store; the page decides how loudly it asks. */
export const InquiryButton = ({ label, variant }: InquiryButtonProps) => {
  return (
    <Button asChild variant={variant} className="h-11 px-6">
      <ExternalLink href={generalInquiryUrl(publicConfig.whatsappNumber)}>
        <WhatsAppIcon />
        {label}
      </ExternalLink>
    </Button>
  );
};
