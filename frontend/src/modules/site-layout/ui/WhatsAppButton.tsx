import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";

interface WhatsAppButtonProps {
  href: string;
  className?: string;
}

export const WhatsAppButton = ({ href, className }: WhatsAppButtonProps) => {
  return (
    <Button asChild variant="whatsapp" size="sm" className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon />
        WhatsApp
      </a>
    </Button>
  );
};
