import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";

interface WhatsAppButtonProps {
  href: string;
  className?: string;
}

export const WhatsAppButton = ({ href, className }: WhatsAppButtonProps) => {
  return (
    <Button asChild variant="whatsapp" size="sm" className={className}>
      <ExternalLink href={href}>
        <WhatsAppIcon />
        WhatsApp
      </ExternalLink>
    </Button>
  );
};
