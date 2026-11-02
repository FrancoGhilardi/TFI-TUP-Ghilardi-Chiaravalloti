"use client";

import Link from "next/link";

import type { CategoryNode } from "@/modules/catalog";
import { cn } from "@/modules/core/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/modules/core/ui/primitives/navigation-menu";

import { ABOUT, categoryHref, HOME, PRODUCTS } from "../domain/navigation";
import { navItemStyles } from "./nav-styles";
import { NavLink } from "./NavLink";
import { useIsActivePath } from "../application/useIsActivePath";

interface DesktopNavProps {
  categories: CategoryNode[];
  className?: string;
}

const dropdownLinkStyles =
  "block rounded-[10px] px-3 py-2 text-sm font-medium text-ink hover:bg-wheat focus:bg-wheat";

export const DesktopNav = ({ categories, className }: DesktopNavProps) => {
  const productsActive = useIsActivePath(PRODUCTS.href);
  return (
    <NavigationMenu viewport={false} aria-label="Principal" className={cn("flex-none", className)}>
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavLink {...HOME} />
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              navItemStyles({ active: productsActive }),
              "bg-transparent focus:bg-transparent data-open:bg-wheat",
            )}
          >
            {PRODUCTS.label}
          </NavigationMenuTrigger>
          <NavigationMenuContent className="min-w-56 p-2 group-data-[viewport=false]/navigation-menu:rounded-card group-data-[viewport=false]/navigation-menu:shadow-raised">
            <ul className="flex flex-col gap-0.5">
              <li>
                <NavigationMenuLink asChild>
                  <Link href={PRODUCTS.href} className={cn(dropdownLinkStyles, "text-teal")}>
                    Ver todo
                  </Link>
                </NavigationMenuLink>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <NavigationMenuLink asChild>
                    <Link href={categoryHref(category.slug)} className={dropdownLinkStyles}>
                      {category.name}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavLink {...ABOUT} />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};
