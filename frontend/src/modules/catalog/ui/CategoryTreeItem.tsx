"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/modules/core/lib/utils";

import { catalogContent } from "../content/catalog";
import type { CategoryNavItem } from "../domain/category-nav";
import { CategoryNavLink } from "./CategoryNavLink";

interface CategoryTreeItemProps {
  item: CategoryNavItem;
}

/** A category and, behind a toggle, its subcategories nested under it. */
export const CategoryTreeItem = ({ item }: CategoryTreeItemProps) => {
  const [expanded, setExpanded] = useState(item.expanded);
  const listId = useId();

  if (item.children.length === 0) {
    return (
      <li>
        <CategoryNavLink href={item.href} label={item.name} active={item.active} />
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center gap-1">
        <CategoryNavLink
          href={item.href}
          label={item.name}
          active={item.active}
          className="flex-1"
        />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={catalogContent.categories.toggle(item.name)}
          onClick={() => setExpanded((current) => !current)}
          className="grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-soft transition-colors hover:bg-wheat hover:text-ink"
        >
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      <ul
        id={listId}
        aria-label={item.name}
        hidden={!expanded}
        className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-line-soft pl-2"
      >
        {item.children.map((child) => (
          <CategoryTreeItem key={child.id} item={child} />
        ))}
      </ul>
    </li>
  );
};
