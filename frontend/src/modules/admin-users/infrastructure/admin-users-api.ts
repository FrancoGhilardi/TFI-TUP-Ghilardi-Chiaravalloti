import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminUserRow } from "../domain/admin-user";
import type { CreateUserRequest, UpdateUserRequest } from "../domain/user-request";
import type { UsersApiParams } from "../domain/users-query";

/** `UserPageResponseDto` of the API; only the total is read. */
const userPageSchema = z.object({ totalItems: z.number() });

const dateOrNull = z.string().pipe(z.coerce.date()).nullable();

/** `UserResponseDto` of the API. */
const userRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["ADMIN", "SELLER"]),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  lastLoginAt: dateOrNull,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: dateOrNull,
});

const userRowsSchema = z.object({
  items: z.array(userRowSchema),
  totalItems: z.number(),
});

export interface AdminUsersPage {
  /** How many users match, whatever the page size. */
  total: number;
  items: AdminUserRow[];
}

export function createAdminUsersApi(client: ApiClient) {
  const pathOf = (id: string) => `/admin/users/${encodeURIComponent(id)}`;

  return {
    /** `GET /admin/users`: the users that match, by name. Only admins may ask. */
    async list(params: UsersApiParams, signal?: AbortSignal): Promise<AdminUsersPage> {
      const body = await client.get<unknown>("/admin/users", { query: { ...params }, signal });
      const { items, totalItems } = parseResponse(userRowsSchema, body);
      return { total: totalItems, items };
    },

    /** `GET /admin/users/{id}`: a user as the form shows it, also when it is deleted. */
    async get(id: string, signal?: AbortSignal): Promise<AdminUserRow> {
      const body = await client.get<unknown>(pathOf(id), { signal });
      return parseResponse(userRowSchema, body);
    },

    /** `POST /admin/users`: the answer is not read, since once it answers the user exists. */
    async create(request: CreateUserRequest, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>("/admin/users", { body: request, signal });
    },

    /** `PATCH /admin/users/{id}`: only what is sent changes. */
    async update(id: string, changes: UpdateUserRequest, signal?: AbortSignal): Promise<void> {
      await client.patch<unknown>(pathOf(id), { body: changes, signal });
    },

    /** `DELETE /admin/users/{id}`: logical delete; deleting one already deleted changes nothing. */
    async remove(id: string, signal?: AbortSignal): Promise<void> {
      await client.delete<void>(pathOf(id), { signal });
    },

    /** `POST /admin/users/{id}/restore`: the user comes back active. */
    async restore(id: string, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>(`${pathOf(id)}/restore`, { signal });
    },

    /**
     * `POST /admin/users/{id}/reset-password`: the API generates a temporary password and mails
     * it; the user must change it on the next sign-in. Takes no body.
     */
    async resetPassword(id: string, signal?: AbortSignal): Promise<void> {
      await client.post<void>(`${pathOf(id)}/reset-password`, { signal });
    },

    /** `GET /admin/users`: how many users there are that are not deleted. Only admins may ask. */
    async count(signal?: AbortSignal): Promise<number> {
      const body = await client.get<unknown>("/admin/users", { query: { limit: 1 }, signal });
      return parseResponse(userPageSchema, body).totalItems;
    },
  };
}
