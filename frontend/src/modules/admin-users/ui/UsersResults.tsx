import { useSessionUser } from "@/modules/auth";
import { ListFooter } from "@/modules/core/ui/ListFooter";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { OutOfRangeState } from "@/modules/core/ui/OutOfRangeState";
import { TableSkeleton } from "@/modules/core/ui/TableSkeleton";

import { useAdminUsers } from "../application/useAdminUsers";
import { useUserActions } from "../application/useUserActions";
import { usersContent } from "../content/users";
import {
  clearedFilters,
  isFiltered,
  USERS_PAGE_SIZE,
  type UsersQuery,
  usersHref,
} from "../domain/users-query";
import { UsersEmptyState } from "./UsersEmptyState";
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

  if (list.isPending) {
    return <TableSkeleton label={usersContent.loading} />;
  }
  // A refresh that fails keeps showing the last page; only having nothing to show is an error.
  if (!list.data) {
    return <LoadErrorState {...usersContent.error} onRetry={() => void list.refetch()} framed />;
  }

  const { items, total } = list.data;
  if (items.length === 0) {
    return query.page > 1 ? (
      <OutOfRangeState {...usersContent.outOfRange} firstPageHref={usersHref(query, { page: 1 })} />
    ) : (
      <UsersEmptyState filtered={isFiltered(query)} onClear={() => go(clearedFilters())} />
    );
  }

  return (
    // While the next page loads, the last one stays as a reference but cannot be acted on: it is not
    // what the filters and the page on screen now describe.
    <div
      aria-busy={list.isFetching}
      inert={list.isPlaceholderData}
      className={list.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
    >
      <div className="overflow-x-auto md:overflow-visible">
        <UsersTable
          users={items}
          sessionUserId={sessionUser?.id}
          readAt={new Date(list.dataUpdatedAt)}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
          onResetPassword={(id) => void resetPassword(id)}
        />
      </div>
      <ListFooter
        page={query.page}
        pageSize={USERS_PAGE_SIZE}
        shown={items.length}
        total={total}
        summary={usersContent.table.summary}
        hrefFor={(page) => usersHref(query, { page })}
        stale={list.isPlaceholderData}
      />
    </div>
  );
};
