import { Package, Tag, Users } from "lucide-react";
import Link from "next/link";

import { ADMIN_PATHS, canOpenPanelPath, type UserRole } from "@/modules/auth";
import { buttonVariants } from "@/modules/core/ui/primitives/button";

import { homeContent } from "../content/home";
import { Panel } from "./Panel";

interface HomeShortcutsProps {
  role: UserRole;
}

export const HomeShortcuts = ({ role }: HomeShortcutsProps) => {
  const { title, product, category, user } = homeContent.shortcuts;
  const shortcuts = [
    { label: product, href: ADMIN_PATHS.products, icon: Package },
    { label: category, href: ADMIN_PATHS.categories, icon: Tag },
    { label: user, href: ADMIN_PATHS.users, icon: Users },
  ].filter(({ href }) => canOpenPanelPath(role, href));

  return (
    <Panel title={title}>
      <ul className="flex flex-col gap-2">
        {shortcuts.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={buttonVariants({ variant: "outline", className: "w-full justify-start" })}
            >
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
};
