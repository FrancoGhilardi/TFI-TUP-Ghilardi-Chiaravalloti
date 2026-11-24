import { useSessionUser } from "@/modules/auth";
import { ListEmptyState } from "@/modules/core/ui/ListEmptyState";
import { ListResults } from "@/modules/core/ui/ListResults";
import { Users } from "lucide-react";

import { useAdminUsers } from "../application/useAdminUsers";
import { useUserActions } from "../application/useUserActions";
import { usersContent } from "../content/users";
import {
  clearedFilters,
  isFiltered,
  USERS_PAGE_SIZE,
  USERS_PATH,
  type UsersQuery,
  usersHref,
} from "../domain/users-query";
import { UsersTable } from "./UsersTable";

interface UsersResultsProps {
  query: UsersQuery;
  go: (changes: Partial<UsersQuery>) => void;
}

/** What the query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const UsersResults = ({ query, go }: UsersResultsProps) => {
  const list = useAdminUsers(query);
  const { remove, restore, resetPassword, isPending } = useUserActions();
  const sessionUser = useSessionUser();
  const { empty, clear, newUser, table } = usersContent;

  return (
    <ListResults
      list={list}
      page={query.page}
      pageSize={USERS_PAGE_SIZE}
      firstPageHref={usersHref(query, { page: 1 })}
      hrefFor={(page) => usersHref(query, { page })}
      text={{ ...usersContent, summary: table.summary }}
      empty={
        <ListEmptyState
          icon={Users}
          filtered={isFiltered(query)}
          onClear={() => go(clearedFilters())}
          text={{ ...empty, clear }}
          create={{ label: newUser, href: `${USERS_PATH}/nuevo` }}
        />
      }
    >
      {(items, readAt) => (
        <UsersTable
          users={items}
          sessionUserId={sessionUser?.id}
          readAt={readAt}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
          onResetPassword={(id) => void resetPassword(id)}
        />
      )}
    </ListResults>
  );
};
