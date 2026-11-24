import { ActionsHeaderCell } from "@/modules/core/ui/ActionsHeaderCell";
import { HeaderCell } from "@/modules/core/ui/HeaderCell";
import { ListTable } from "@/modules/core/ui/ListTable";

import { usersContent } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { isOwnAccount } from "../domain/own-account";
import { UserRow } from "./UserRow";

interface UsersTableProps {
  users: AdminUserRow[];
  /** Id of the signed-in user, whose own row cannot be given a baja or a new password. */
  sessionUserId: string | undefined;
  readAt: Date;
  isPending: (id: string) => boolean;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onResetPassword: (id: string) => void;
}

export const UsersTable = ({
  users,
  sessionUserId,
  readAt,
  isPending,
  onRemove,
  onRestore,
  onResetPassword,
}: UsersTableProps) => {
  const { caption, columns } = usersContent.table;

  return (
    <ListTable
      caption={caption}
      head={
        <>
          <HeaderCell>{columns.user}</HeaderCell>
          <HeaderCell>{columns.role}</HeaderCell>
          <HeaderCell>{columns.state}</HeaderCell>
          <HeaderCell>{columns.lastAccess}</HeaderCell>
          <ActionsHeaderCell label={columns.actions} />
        </>
      }
    >
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          own={isOwnAccount(sessionUserId, user.id)}
          readAt={readAt}
          pending={isPending(user.id)}
          onRemove={() => onRemove(user.id)}
          onRestore={() => onRestore(user.id)}
          onResetPassword={() => onResetPassword(user.id)}
        />
      ))}
    </ListTable>
  );
};
