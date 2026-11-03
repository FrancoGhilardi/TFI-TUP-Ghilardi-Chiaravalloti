import { z } from "zod";

import { type ApiClient, createApiClient, parseResponse } from "@/modules/core/http";

import type { AuthenticatedUser } from "../domain/user";

/** `AccessTokenResponseDto` of the API. */
const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(["ADMIN", "SELLER"]),
    mustChangePassword: z.boolean(),
  }),
});

export interface LoginCredentials {
  email: string;
  password: string;
}

/** What starts a session: the token to send in each request and who it belongs to. */
export interface LoginResult {
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: AuthenticatedUser;
}

export function createAuthApi(client: ApiClient) {
  return {
    /** `POST /auth/login`: the refresh token comes back in a cookie the browser keeps. */
    async login(credentials: LoginCredentials, signal?: AbortSignal): Promise<LoginResult> {
      const body = await client.post<unknown>("/auth/login", { body: credentials, signal });
      return parseResponse(sessionSchema, body);
    },
  };
}

// The refresh token cookie belongs to the API's domain, so the browser has to send and keep it.
export const authApi = createAuthApi(createApiClient({ credentials: "include" }));
