"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import type { CategoryNode } from "@/modules/catalog";
import { useOnMediaQueryMatch } from "@/modules/core/hooks/useOnMediaQueryMatch";
import { cn } from "@/modules/core/lib/utils";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/modules/core/ui/primitives/sheet";

import { ABOUT, DESKTOP_NAV_MEDIA_QUERY, HOME, PRODUCTS } from "../domain/navigation";
import { mobileMenuRowStyles } from "./mobile-menu-styles";
import { MobileCategoryLink } from "./MobileCategoryLink";
import { MobileSectionLink } from "./MobileSectionLink";

interface MobileMenuProps {
  categories: CategoryNode[];
  whatsappUrl: string;
  className?: string;
}

export const MobileMenu = ({ categories, whatsappUrl, className }: MobileMenuProps) => {
  const [open, setOpen] = useState(false);
  // From this width the menu button is hidden, so an open menu would have no way to close.
  useOnMediaQueryMatch(DESKTOP_NAV_MEDIA_QUERY, () => setOpen(false));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          className={cn("text-ink", className)}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        aria-describedby={undefined}
        className="max-h-dvh gap-0 overflow-y-auto bg-cream pt-14"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <nav aria-label="Principal">
          <ul>
            <li>
              <MobileSectionLink {...HOME} />
            </li>
            <li>
              <MobileSectionLink {...PRODUCTS} />
              {categories.length > 0 && (
                <ul aria-label="Categorías">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <MobileCategoryLink category={category} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li>
              <MobileSectionLink {...ABOUT} />
            </li>
          </ul>
        </nav>
        <ExternalLink
          href={whatsappUrl}
          className={cn(mobileMenuRowStyles, "flex items-center gap-2 border-b-0 text-wa-strong")}
        >
          <WhatsAppIcon />
          Consultar por WhatsApp
        </ExternalLink>
      </SheetContent>
    </Sheet>
  );
};
