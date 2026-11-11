import { useQuery } from "@tanstack/react-query";

import { adminUsersApi } from "../infrastructure/admin-users-client";

/** A user as the edit form shows it; refreshed whenever the users are read again. */
export function useUser(id: string) {
  return useQuery({
    queryKey: ["admin-users", "detail", id],
    // Dropped once nobody shows it: reopening starts from what the server has, never from a copy
    // that was marked stale after a save.
    gcTime: 0,
    queryFn: ({ signal }) => adminUsersApi.get(id, signal),
  });
}
