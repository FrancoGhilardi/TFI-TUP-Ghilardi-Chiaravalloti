import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { InstagramIcon } from "@/modules/core/ui/icons/InstagramIcon";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";

interface SocialLinksProps {
  instagramUrl: string;
  whatsappUrl: string;
}

const linkStyles =
  "flex size-10 items-center justify-center rounded-full border border-white/20 text-footer-text transition-colors hover:border-gold hover:bg-gold hover:text-ink";

export const SocialLinks = ({ instagramUrl, whatsappUrl }: SocialLinksProps) => {
  return (
    <ul className="mt-3.5 flex gap-2.5">
      <li>
        <ExternalLink href={instagramUrl} aria-label="Instagram" className={linkStyles}>
          <InstagramIcon />
        </ExternalLink>
      </li>
      <li>
        <ExternalLink href={whatsappUrl} aria-label="WhatsApp" className={linkStyles}>
          <WhatsAppIcon />
        </ExternalLink>
      </li>
    </ul>
  );
};
