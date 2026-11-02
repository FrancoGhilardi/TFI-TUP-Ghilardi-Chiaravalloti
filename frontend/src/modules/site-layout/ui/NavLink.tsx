"use client";

import Link from "next/link";

import { NavigationMenuLink } from "@/modules/core/ui/primitives/navigation-menu";

import { useIsActivePath } from "../application/useIsActivePath";
import type { NavItem } from "../domain/navigation";
import { navItemStyles } from "./nav-styles";

type NavLinkProps = NavItem;

/** Top-level link of the desktop navigation; Radix includes it in the arrow-key order and sets `aria-current`. */
export const NavLink = ({ label, href }: NavLinkProps) => {
  const active = useIsActivePath(href);
  return (
    <NavigationMenuLink asChild active={active} className={navItemStyles({ active })}>
      <Link href={href}>{label}</Link>
    </NavigationMenuLink>
  );
};
