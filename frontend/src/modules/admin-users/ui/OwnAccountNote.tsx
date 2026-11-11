import { UserRound } from "lucide-react";
import Link from "next/link";

import { ADMIN_PATHS } from "@/modules/auth";

import { userFormText } from "../content/users";

/** On the signed-in user's own form: why some of what an admin can do to others is not offered. */
export const OwnAccountNote = () => {
  const { note, account } = userFormText.ownAccount;
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-wheat px-4 py-3 text-sm text-ink"
    >
      <UserRound className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      <p className="flex-1">{note}</p>
      <Link
        href={ADMIN_PATHS.account}
        className="rounded-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {account}
      </Link>
    </div>
  );
};
