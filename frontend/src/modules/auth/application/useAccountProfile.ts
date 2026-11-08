import { useQuery } from "@tanstack/react-query";

import { sessionAuthApi } from "./session-client";

/** The signed-in person's data as the API has it, with dates the session does not carry. */
export function useAccountProfile() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: ({ signal }) => sessionAuthApi.me(signal),
  });
}
