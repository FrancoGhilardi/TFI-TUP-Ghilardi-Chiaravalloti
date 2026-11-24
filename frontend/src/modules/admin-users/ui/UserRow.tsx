import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { ListRow } from "@/modules/core/ui/ListRow";
import { RowActionsCell } from "@/modules/core/ui/RowActionsCell";
import { RowCell } from "@/modules/core/ui/RowCell";
import { RowLeadCell } from "@/modules/core/ui/RowLeadCell";

import { roleLabels, usersContent } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { userState } from "../domain/user-state";
import { USERS_PATH } from "../domain/users-query";
import { UserRowActions } from "./UserRowActions";
import { UserStateBadge } from "./UserStateBadge";

interface UserRowProps {
  user: AdminUserRow;
  /** The user is the one signed in. */
  own: boolean;
  /** The moment the list was read, to say how long ago each user signed in. */
  readAt: Date;
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
  onResetPassword: () => void;
}

export const UserRow = ({
  user,
  own,
  readAt,
  pending,
  onRemove,
  onRestore,
  onResetPassword,
}: UserRowProps) => {
  const { columns, you, never, mustChangePassword } = usersContent.table;
  const state = userState(user);

  return (
    <ListRow deleted={state === "deleted"}>
      <RowLeadCell>
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            {state === "deleted" ? (
              <span className="block truncate font-semibold">{user.name}</span>
            ) : (
              <Link
                href={`${USERS_PATH}/${user.id}`}
                className="block truncate font-semibold text-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                {user.name}
              </Link>
            )}
            <span className="block truncate text-xs text-ink-soft">{user.email}</span>
          </div>
          {own && (
            <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-deep">
              {you}
            </span>
          )}
        </div>
      </RowLeadCell>
      <RowCell label={columns.role}>{roleLabels[user.role]}</RowCell>
      <RowCell label={columns.state}>
        <span className="flex flex-wrap items-center gap-1.5">
          <UserStateBadge state={state} />
          {user.mustChangePassword && state !== "deleted" && (
            <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-deep">
              {mustChangePassword}
            </span>
          )}
        </span>
      </RowCell>
      <RowCell label={columns.lastAccess}>
        {user.lastLoginAt ? (
          <time
            dateTime={user.lastLoginAt.toISOString()}
            title={formatDateTime(user.lastLoginAt)}
            className="text-xs"
          >
            {formatRelativeTime(user.lastLoginAt, readAt)}
          </time>
        ) : (
          <span className="text-xs text-ink-soft">{never}</span>
        )}
      </RowCell>
      <RowActionsCell>
        <UserRowActions
          user={user}
          own={own}
          pending={pending}
          onRemove={onRemove}
          onRestore={onRestore}
          onResetPassword={onResetPassword}
        />
      </RowActionsCell>
    </ListRow>
  );
};
