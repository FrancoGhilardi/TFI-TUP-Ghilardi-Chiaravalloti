import Link from "next/link";

import { categoryHref, type CategoryNode } from "@/modules/catalog";
import { publicConfig } from "@/modules/core/config/env";
import { siteConfig } from "@/modules/core/config/site";
import { Container } from "@/modules/core/ui/Container";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { Wordmark } from "@/modules/core/ui/Wordmark";

import { ABOUT, FOOTER_CATEGORY_LIMIT, PRODUCTS } from "../domain/navigation";
import { FooterColumn } from "./FooterColumn";
import { SocialLinks } from "./SocialLinks";

interface SiteFooterProps {
  categories: CategoryNode[];
  whatsappUrl: string;
}

const linkStyles = "text-footer-text transition-colors hover:text-white";

export const SiteFooter = ({ categories, whatsappUrl }: SiteFooterProps) => {
  const storeLinks = [
    <Link key={PRODUCTS.href} href={PRODUCTS.href} className={linkStyles}>
      {PRODUCTS.label}
    </Link>,
    ...categories.slice(0, FOOTER_CATEGORY_LIMIT).map((category) => (
      <Link key={category.id} href={categoryHref(category.slug)} className={linkStyles}>
        {category.name}
      </Link>
    )),
  ];
  const services = [
    ...siteConfig.services.map(({ label }) => label),
    <Link key={ABOUT.href} href={ABOUT.href} className={linkStyles}>
      {ABOUT.label}
    </Link>,
  ];
  const contact = [
    <ExternalLink key="whatsapp" href={whatsappUrl} className={linkStyles}>
      WhatsApp: {publicConfig.whatsappDisplay}
    </ExternalLink>,
    siteConfig.address,
    ...siteConfig.hours.map(({ days, time }) => `${days} · ${time}`),
    <a key="email" href={`mailto:${siteConfig.email}`} className={linkStyles}>
      {siteConfig.email}
    </a>,
  ];

  return (
    <footer className="mt-8 bg-ink text-footer-text">
      <Container className="grid grid-cols-1 gap-7 py-14 min-[481px]:grid-cols-2 min-[781px]:grid-cols-[1.4fr_1fr_1fr_1.2fr] min-[781px]:gap-8">
        <div>
          <Wordmark tone="onDark" size="lg" />
          <p className="mt-1 font-script text-2xl text-gold">{siteConfig.tagline}</p>
          <p className="mt-3 text-[0.92rem]">{siteConfig.description}</p>
          <SocialLinks instagramUrl={siteConfig.instagramUrl} whatsappUrl={whatsappUrl} />
        </div>
        <FooterColumn title="Tienda" items={storeLinks} />
        <FooterColumn title="Servicios" items={services} />
        <FooterColumn title="Contacto" items={contact} />
      </Container>
      <Container className="border-t border-white/10 py-4.5 text-center text-[0.82rem] text-footer-muted">
        © {new Date().getFullYear()} {siteConfig.name}
      </Container>
    </footer>
  );
};
