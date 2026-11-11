import { Archive, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

import { useUserActions } from "../application/useUserActions";
import { ownAccountReasons, roleLabels, usersContent, userFormText } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { userState } from "../domain/user-state";
import { USERS_PATH } from "../domain/users-query";
import { UserStateBadge } from "./UserStateBadge";

interface UserFormHeaderProps {
  /** Absent when creating. */
  user?: AdminUserRow;
  /** The user is the one signed in. */
  own: boolean;
}

export const UserFormHeader = ({ user, own }: UserFormHeaderProps) => {
  const { remove, resetPassword, isPending } = useUserActions();
  const { back, newTitle, newLead, meta } = userFormText;
  const { confirmRemove, confirmResetPassword } = usersContent;
  const state = user ? userState(user) : undefined;
  const pending = user ? isPending(user.id) : false;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link
          href={USERS_PATH}
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back}
        </Link>
        <Eyebrow className="mt-3">{usersContent.eyebrow}</Eyebrow>
        <h1 className="mt-1 text-[1.9rem] font-semibold">{user?.name ?? newTitle}</h1>
        {user && state ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span>{roleLabels[user.role]}</span>
            <span aria-hidden="true">·</span>
            <span>{meta.createdAt(formatDate(user.createdAt))}</span>
            <span aria-hidden="true">·</span>
            <span>
              {user.lastLoginAt
                ? meta.lastAccess(formatRelativeTime(user.lastLoginAt, new Date()))
                : meta.neverAccessed}
            </span>
            <UserStateBadge state={state} />
          </p>
        ) : (
          <p className="mt-1 max-w-[60ch] text-ink-soft">{newLead}</p>
        )}
      </div>
      {user && state !== "deleted" && (
        <div className="flex flex-wrap items-center gap-2">
          {own ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled
                title={ownAccountReasons.resetPassword}
              >
                <KeyRound aria-hidden="true" />
                {userFormText.resetPassword}
              </Button>
              <Button type="button" variant="outline" disabled title={ownAccountReasons.remove}>
                <Archive aria-hidden="true" />
                {userFormText.remove}
              </Button>
            </>
          ) : (
            <>
              <ConfirmDialog
                title={confirmResetPassword.title(user.name)}
                description={confirmResetPassword.description}
                confirmLabel={confirmResetPassword.confirm}
                onConfirm={() => void resetPassword(user.id)}
                disabled={pending}
              >
                <Button type="button" variant="outline" disabled={pending}>
                  <KeyRound aria-hidden="true" />
                  {userFormText.resetPassword}
                </Button>
              </ConfirmDialog>
              <ConfirmDialog
                title={confirmRemove.title(user.name)}
                description={confirmRemove.description}
                confirmLabel={confirmRemove.confirm}
                onConfirm={() => void remove(user.id)}
                disabled={pending}
              >
                <Button type="button" variant="outline" disabled={pending}>
                  <Archive aria-hidden="true" />
                  {userFormText.remove}
                </Button>
              </ConfirmDialog>
            </>
          )}
        </div>
      )}
    </header>
  );
};
