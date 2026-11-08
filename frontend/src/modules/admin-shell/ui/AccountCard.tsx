import { useAccountProfile, type AuthenticatedUser } from "@/modules/auth";
import { formatDate, formatDateTime } from "@/modules/core/formatters/date-time";

import { accountContent } from "../content/account";
import { shellContent } from "../content/shell";
import { initialsOf } from "../domain/person-name";
import { AccountDetail } from "./AccountDetail";

interface AccountCardProps {
  user: AuthenticatedUser;
}

/** Who the person is. The dates come from the API when it has them; without them, the lines are left out. */
export const AccountCard = ({ user }: AccountCardProps) => {
  const { lastLoginAt, createdAt } = useAccountProfile().data ?? {};
  return (
    <section
      aria-label={accountContent.title}
      className="flex flex-col items-center rounded-card border border-line-soft bg-surface p-7 text-center shadow-sm"
    >
      <span
        aria-hidden="true"
        className="grid size-[76px] place-items-center rounded-full bg-gold text-2xl font-bold text-ink"
      >
        {initialsOf(user.name)}
      </span>
      <h2 className="mt-3.5 text-2xl font-semibold">{user.name}</h2>
      <p className="text-ink-soft">{user.email}</p>
      <p className="mt-3 rounded-full bg-teal-soft px-3 py-1 text-sm font-semibold text-teal-deep">
        {shellContent.roles[user.role]}
      </p>
      <dl className="mt-5 w-full text-left">
        {lastLoginAt && (
          <AccountDetail label={accountContent.lastLogin} value={formatDateTime(lastLoginAt)} />
        )}
        {createdAt && (
          <AccountDetail label={accountContent.createdAt} value={formatDate(createdAt)} />
        )}
      </dl>
      <p className="mt-4 text-sm text-ink-soft">{accountContent.help[user.role]}</p>
    </section>
  );
};
