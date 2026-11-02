import Link from "next/link";

import { cn } from "@/modules/core/lib/utils";

interface CategoryNavLinkProps {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}

/** A row of the category tree; the current category is highlighted. */
export const CategoryNavLink = ({ href, label, active, className }: CategoryNavLinkProps) => {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-teal-soft text-teal" : "text-ink-soft hover:bg-wheat hover:text-ink",
        className,
      )}
    >
      {label}
    </Link>
  );
};
