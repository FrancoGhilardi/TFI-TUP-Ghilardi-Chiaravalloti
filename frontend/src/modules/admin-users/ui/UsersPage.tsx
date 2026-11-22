"use client";

import { ListPage } from "@/modules/core/ui/ListPage";

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
    <ListPage
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      create={{ label: newUser, href: `${USERS_PATH}/nuevo` }}
    >
      <UsersToolbar query={query} go={go} />
      <UsersResults query={query} go={go} />
    </ListPage>
  );
};
