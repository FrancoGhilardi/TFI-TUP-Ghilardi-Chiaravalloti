import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { cn } from "@/modules/core/lib/utils";

import { roleLabels, usersContent } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { userState } from "../domain/user-state";
import { USERS_PATH } from "../domain/users-query";
import { UserRowActions } from "./UserRowActions";
import { UserStateBadge } from "./UserStateBadge";

const CELL =
  "px-3 py-3 align-middle max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-xs max-md:before:font-semibold max-md:before:text-ink-soft max-md:before:content-[attr(data-label)]";

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
    <tr
      className={cn(
        "border-t border-line-soft max-md:block max-md:rounded-card max-md:border max-md:p-4",
        state === "deleted" && "bg-wheat/40 text-ink-soft",
      )}
    >
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pt-0">
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
      </td>
      <td data-label={columns.role} className={CELL}>
        {roleLabels[user.role]}
      </td>
      <td data-label={columns.state} className={CELL}>
        <span className="flex flex-wrap items-center gap-1.5">
          <UserStateBadge state={state} />
          {user.mustChangePassword && state !== "deleted" && (
            <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-deep">
              {mustChangePassword}
            </span>
          )}
        </span>
      </td>
      <td data-label={columns.lastAccess} className={CELL}>
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
      </td>
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pb-0">
        <UserRowActions
          user={user}
          own={own}
          pending={pending}
          onRemove={onRemove}
          onRestore={onRestore}
          onResetPassword={onResetPassword}
        />
      </td>
    </tr>
  );
};
