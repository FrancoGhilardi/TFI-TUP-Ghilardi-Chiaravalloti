import type { ReactNode } from "react";

import type { CategoryNode } from "@/modules/catalog";
import { Container } from "@/modules/core/ui/Container";

import { Brand } from "./Brand";
import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";
import { WhatsAppButton } from "./WhatsAppButton";

interface SiteHeaderProps {
  categories: CategoryNode[];
  whatsappUrl: string;
  /** Cart control, provided by whoever owns the cart state. */
  cart: ReactNode;
}

export const SiteHeader = ({ categories, whatsappUrl, cart }: SiteHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-cream/85 backdrop-blur-md">
      <Container className="flex h-[74px] items-center gap-3 nav:gap-4">
        <Brand />
        <DesktopNav categories={categories} className="hidden nav:flex" />
        <WhatsAppButton href={whatsappUrl} className="hidden nav:inline-flex" />
        {cart}
        <MobileMenu categories={categories} whatsappUrl={whatsappUrl} className="nav:hidden" />
      </Container>
    </header>
  );
};
