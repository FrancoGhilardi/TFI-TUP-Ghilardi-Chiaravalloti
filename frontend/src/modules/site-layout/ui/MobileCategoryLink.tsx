"use client";

import { categoryHref, type CategoryNode } from "@/modules/catalog";
import { cn } from "@/modules/core/lib/utils";

import { mobileMenuRowStyles } from "./mobile-menu-styles";
import { MobileMenuRow } from "./MobileMenuRow";

interface MobileCategoryLinkProps {
  category: CategoryNode;
}

export const MobileCategoryLink = ({ category }: MobileCategoryLinkProps) => {
  return (
    <MobileMenuRow
      label={category.name}
      href={categoryHref(category.slug)}
      className={cn(mobileMenuRowStyles, "pl-10 font-medium text-ink-soft")}
    />
  );
};
