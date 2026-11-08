import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Wordmark } from "@/modules/core/ui/Wordmark";
import type { AuthenticatedUser } from "@/modules/auth";

import { useMenuCounts } from "../application/useMenuCounts";
import { shellContent } from "../content/shell";
import { menuFor } from "../domain/menu";
import { SidebarLink } from "./SidebarLink";
import { UserCard } from "./UserCard";

interface SidebarContentProps {
  user: AuthenticatedUser;
  pathname: string;
  onNavigate?: () => void;
}

/** What the sidebar holds, shared by the fixed one and the one that opens on small screens. */
export const SidebarContent = ({ user, pathname, onNavigate }: SidebarContentProps) => {
  const counts = useMenuCounts(user.role);
  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex items-center gap-3 px-5 py-5">
        <DaisyMark size={38} />
        <Wordmark tone="onDark" />
        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-footer-text">
          {shellContent.panelBadge}
        </span>
      </div>
      <nav aria-label={shellContent.navigationLabel} className="flex-1 overflow-y-auto px-3 pb-4">
        {menuFor(user.role).map(({ group, label, items }) => (
          <section key={group} aria-label={label} className="mt-4 first:mt-0">
            <h2 className="px-3 pb-1.5 text-xs font-bold tracking-[0.14em] text-footer-muted uppercase">
              {label}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <SidebarLink
                    item={item}
                    pathname={pathname}
                    count={counts[item.id]}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <UserCard user={user} />
    </div>
  );
};
