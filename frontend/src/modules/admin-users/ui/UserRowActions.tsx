import { Archive, KeyRound, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { ownAccountReasons, usersContent } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { userState } from "../domain/user-state";
import { USERS_PATH } from "../domain/users-query";

const BUTTON =
  "grid size-9 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";

interface UserRowActionsProps {
  user: AdminUserRow;
  /** The user is the one signed in: what an admin cannot do to themselves is disabled. */
  own: boolean;
  /** A request for this user is on its way. */
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
  onResetPassword: () => void;
}

/** Edit, send a temporary password and give a logical delete to a user, or bring a deleted one back. */
export const UserRowActions = ({
  user,
  own,
  pending,
  onRemove,
  onRestore,
  onResetPassword,
}: UserRowActionsProps) => {
  const { actions, confirmRemove, confirmResetPassword } = usersContent;

  if (userState(user) === "deleted") {
    return (
      <span className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label={actions.restore(user.name)}
          title={actions.restore(user.name)}
          disabled={pending}
          onClick={onRestore}
          className={BUTTON}
        >
          <RotateCcw className="size-[18px]" aria-hidden="true" />
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-end gap-1">
      <Link
        href={`${USERS_PATH}/${user.id}`}
        aria-label={actions.edit(user.name)}
        title={actions.edit(user.name)}
        className={BUTTON}
      >
        <Pencil className="size-[18px]" aria-hidden="true" />
      </Link>
      {own ? (
        <>
          <button
            type="button"
            aria-label={actions.resetPassword(user.name)}
            title={ownAccountReasons.resetPassword}
            disabled
            className={BUTTON}
          >
            <KeyRound className="size-[18px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={actions.remove(user.name)}
            title={ownAccountReasons.remove}
            disabled
            className={BUTTON}
          >
            <Archive className="size-[18px]" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <ConfirmDialog
            title={confirmResetPassword.title(user.name)}
            description={confirmResetPassword.description}
            confirmLabel={confirmResetPassword.confirm}
            onConfirm={onResetPassword}
            disabled={pending}
          >
            <button
              type="button"
              aria-label={actions.resetPassword(user.name)}
              title={actions.resetPassword(user.name)}
              disabled={pending}
              className={BUTTON}
            >
              <KeyRound className="size-[18px]" aria-hidden="true" />
            </button>
          </ConfirmDialog>
          <ConfirmDialog
            title={confirmRemove.title(user.name)}
            description={confirmRemove.description}
            confirmLabel={confirmRemove.confirm}
            onConfirm={onRemove}
            disabled={pending}
          >
            <button
              type="button"
              aria-label={actions.remove(user.name)}
              title={actions.remove(user.name)}
              disabled={pending}
              className={BUTTON}
            >
              <Archive className="size-[18px]" aria-hidden="true" />
            </button>
          </ConfirmDialog>
        </>
      )}
    </span>
  );
};
