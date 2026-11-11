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

/** A table from the medium width; below it every row is a card with the same information. */
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
  const head = "px-3 py-3 text-left font-semibold text-ink-soft";

  return (
    <table className="w-full text-sm max-md:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr className="text-xs tracking-wide uppercase">
          <th scope="col" className={head}>
            {columns.user}
          </th>
          <th scope="col" className={head}>
            {columns.role}
          </th>
          <th scope="col" className={head}>
            {columns.state}
          </th>
          <th scope="col" className={head}>
            {columns.lastAccess}
          </th>
          <th scope="col" className="px-3 py-3">
            <span className="sr-only">{columns.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody className="max-md:block max-md:space-y-3 max-md:p-3">
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
      </tbody>
    </table>
  );
};
