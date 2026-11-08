import { LogOut } from "lucide-react";

import { LogoutConfirm, type AuthenticatedUser } from "@/modules/auth";

import { shellContent } from "../content/shell";
import { initialsOf } from "../domain/person-name";

interface UserCardProps {
  user: AuthenticatedUser;
}

/** Who is signed in, with the way to sign out. */
export const UserCard = ({ user }: UserCardProps) => {
  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-sm font-bold text-ink"
      >
        {initialsOf(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs text-footer-muted">{shellContent.roles[user.role]}</p>
      </div>
      <LogoutConfirm>
        <button
          type="button"
          aria-label={shellContent.logout}
          className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-footer-text outline-none hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
        </button>
      </LogoutConfirm>
    </div>
  );
};
