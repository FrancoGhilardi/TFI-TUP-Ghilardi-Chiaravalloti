"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

import { useUsersQuery } from "../application/useUsersQuery";
import { usersContent } from "../content/users";
import { USERS_PATH } from "../domain/users-query";
import { UsersResults } from "./UsersResults";
import { UsersToolbar } from "./UsersToolbar";

/** The panel's list of users: search, filters, the logical delete and the temporary password. */
export const UsersPage = () => {
  const { query, go } = useUsersQuery();
  const { eyebrow, title, lead, newUser } = usersContent;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1.5 text-[1.9rem] font-semibold">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-ink-soft">{lead}</p>
        </div>
        <Button asChild>
          <Link href={`${USERS_PATH}/nuevo`}>
            <Plus aria-hidden="true" />
            {newUser}
          </Link>
        </Button>
      </header>
      <section
        aria-label={title}
        className="rounded-card border border-line-soft bg-surface shadow-sm"
      >
        <UsersToolbar query={query} go={go} />
        <UsersResults query={query} go={go} />
      </section>
    </div>
  );
};
