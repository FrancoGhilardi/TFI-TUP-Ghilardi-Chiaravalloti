import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { toApiQuery, type UsersQuery } from "../domain/users-query";
import { adminUsersApi } from "../infrastructure/admin-users-client";

/** The page of users a query asks for; while the next one loads, the table keeps the last. */
export function useAdminUsers(query: UsersQuery) {
  const params = toApiQuery(query);
  return useQuery({
    queryKey: ["admin-users", "list", params],
    queryFn: ({ signal }) => adminUsersApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}
