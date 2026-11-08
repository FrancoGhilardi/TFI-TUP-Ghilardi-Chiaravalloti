import { useQuery } from "@tanstack/react-query";

import { adminUsersApi } from "../infrastructure/admin-users-client";

interface UsersTotalOptions {
  /** Off for roles the API would refuse, so the request is never made. */
  enabled: boolean;
}

/** How many users there are that are not deleted. */
export function useUsersTotal({ enabled }: UsersTotalOptions) {
  return useQuery({
    queryKey: ["admin-users", "total"],
    queryFn: ({ signal }) => adminUsersApi.count(signal),
    enabled,
  });
}
