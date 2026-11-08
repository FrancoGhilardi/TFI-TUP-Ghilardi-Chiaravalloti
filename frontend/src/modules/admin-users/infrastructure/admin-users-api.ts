import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

/** `UserPageResponseDto` of the API; only the total is read. */
const userPageSchema = z.object({ totalItems: z.number() });

export function createAdminUsersApi(client: ApiClient) {
  return {
    /** `GET /admin/users`: how many users there are that are not deleted. Only admins may ask. */
    async count(signal?: AbortSignal): Promise<number> {
      const body = await client.get<unknown>("/admin/users", { query: { limit: 1 }, signal });
      return parseResponse(userPageSchema, body).totalItems;
    },
  };
}
