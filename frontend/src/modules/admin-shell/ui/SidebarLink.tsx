import Link from "next/link";

import { cn } from "@/modules/core/lib/utils";

import { isActiveItem, type MenuItem } from "../domain/menu";
import { CountBadge } from "./CountBadge";
import { MENU_ICONS } from "./menu-icons";

interface SidebarLinkProps {
  item: MenuItem;
  pathname: string;
  /** How many there are behind it, when known. */
  count?: number;
  /** Runs when the link is followed, such as to close the menu that holds it. */
  onNavigate?: () => void;
}

export const SidebarLink = ({ item, pathname, count, onNavigate }: SidebarLinkProps) => {
  const Icon = MENU_ICONS[item.id];
  const active = !item.external && isActiveItem(pathname, item.href);
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-footer-text outline-none hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60",
        active && "bg-white/15 text-white",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
      {count !== undefined && <CountBadge value={count} />}
    </Link>
  );
};
