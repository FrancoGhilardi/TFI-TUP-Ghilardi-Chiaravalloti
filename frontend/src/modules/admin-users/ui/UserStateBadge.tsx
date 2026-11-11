import { cn } from "@/modules/core/lib/utils";

import { usersContent } from "../content/users";
import type { UserState } from "../domain/user-state";

const STYLES: Record<UserState, string> = {
  active: "bg-teal-soft text-teal-deep",
  inactive: "bg-wheat text-ink-soft",
  deleted: "bg-coral-soft text-coral-strong",
};

interface UserStateBadgeProps {
  state: UserState;
}

export const UserStateBadge = ({ state }: UserStateBadgeProps) => {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STYLES[state])}>
      {usersContent.table.states[state]}
    </span>
  );
};
