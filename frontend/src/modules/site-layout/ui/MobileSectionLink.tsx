"use client";

import { cn } from "@/modules/core/lib/utils";

import { useIsActivePath } from "../application/useIsActivePath";
import type { NavItem } from "../domain/navigation";
import { mobileMenuRowStyles } from "./mobile-menu-styles";
import { MobileMenuRow } from "./MobileMenuRow";

type MobileSectionLinkProps = NavItem;

export const MobileSectionLink = (item: MobileSectionLinkProps) => {
  const active = useIsActivePath(item.href);
  return (
    <MobileMenuRow
      {...item}
      aria-current={active ? "page" : undefined}
      className={cn(mobileMenuRowStyles, active && "text-teal")}
    />
  );
};
