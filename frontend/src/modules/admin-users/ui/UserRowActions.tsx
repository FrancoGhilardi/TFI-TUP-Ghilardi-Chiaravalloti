import { Archive, KeyRound, Pencil, RotateCcw } from "lucide-react";

import { BlockedRowAction } from "@/modules/core/ui/BlockedRowAction";
import { ConfirmRowAction } from "@/modules/core/ui/ConfirmRowAction";
import { RowActionButton } from "@/modules/core/ui/RowActionButton";
import { RowActionLink } from "@/modules/core/ui/RowActionLink";
import { RowActions } from "@/modules/core/ui/RowActions";

import { ownAccountReasons, usersContent } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { userState } from "../domain/user-state";
import { USERS_PATH } from "../domain/users-query";

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
  const { name } = user;

  if (userState(user) === "deleted") {
    return (
      <RowActions>
        <RowActionButton
          icon={RotateCcw}
          label={actions.restore(name)}
          disabled={pending}
          onClick={onRestore}
        />
      </RowActions>
    );
  }
  return (
    <RowActions>
      <RowActionLink icon={Pencil} label={actions.edit(name)} href={`${USERS_PATH}/${user.id}`} />
      {own ? (
        <>
          <BlockedRowAction
            icon={KeyRound}
            label={actions.resetPassword(name)}
            reason={ownAccountReasons.resetPassword}
          />
          <BlockedRowAction
            icon={Archive}
            label={actions.remove(name)}
            reason={ownAccountReasons.remove}
          />
        </>
      ) : (
        <>
          <ConfirmRowAction
            icon={KeyRound}
            label={actions.resetPassword(name)}
            dialog={{ ...confirmResetPassword, title: confirmResetPassword.title(name) }}
            onConfirm={onResetPassword}
            pending={pending}
          />
          <ConfirmRowAction
            icon={Archive}
            label={actions.remove(name)}
            dialog={{ ...confirmRemove, title: confirmRemove.title(name) }}
            onConfirm={onRemove}
            pending={pending}
          />
        </>
      )}
    </RowActions>
  );
};
