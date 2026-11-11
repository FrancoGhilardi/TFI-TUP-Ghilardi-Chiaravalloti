import { useListQuery } from "@/modules/core/hooks/useListQuery";

import { parseUsersQuery, usersHref } from "../domain/users-query";

/** The list's query as the address has it, and the way to change it by going to a new address. */
export function useUsersQuery() {
  return useListQuery(parseUsersQuery, usersHref);
}
