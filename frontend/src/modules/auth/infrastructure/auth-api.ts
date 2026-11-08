import { z } from "zod";

import { type ApiClient, createApiClient, parseResponse } from "@/modules/core/http";

import type { AccountProfile } from "../domain/account-profile";
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

/**
 * `AuthenticatedUserResponseDto` of the API. The dates are read when it sends them and left out
 * when it does not, so the screen that shows them works with either.
 */
const profileSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.enum(["ADMIN", "SELLER"]),
  lastLoginAt: z.string().pipe(z.coerce.date()).nullish(),
  createdAt: z.string().pipe(z.coerce.date()).nullish(),
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/** What starts or renews a session: the token to send in each request and who it belongs to. */
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

    /** `POST /auth/forgot-password`: always answers 204, whether the email exists or not. */
    async forgotPassword(email: string, signal?: AbortSignal): Promise<void> {
      await client.post<void>("/auth/forgot-password", { body: { email }, signal });
    },

    /** `GET /auth/me`: the signed-in person's data, for a client with a session. */
    async me(signal?: AbortSignal): Promise<AccountProfile> {
      const body = await client.get<unknown>("/auth/me", { signal });
      const { lastLoginAt, createdAt, ...profile } = parseResponse(profileSchema, body);
      return {
        ...profile,
        ...(lastLoginAt && { lastLoginAt }),
        ...(createdAt && { createdAt }),
      };
    },

    /** `POST /auth/logout`: closes the session of the refresh cookie and the ones renewed from it. */
    async logout(signal?: AbortSignal): Promise<void> {
      await client.post<void>("/auth/logout", { signal });
    },

    /** `POST /auth/refresh`: the cookie's refresh token is rotated and a new access token given. */
    async refresh(signal?: AbortSignal): Promise<LoginResult> {
      const body = await client.post<unknown>("/auth/refresh", { signal });
      return parseResponse(sessionSchema, body);
    },

    /** `POST /auth/change-password`: needs a signed-in client; gives the renewed session. */
    async changePassword(change: PasswordChange, signal?: AbortSignal): Promise<LoginResult> {
      const body = await client.post<unknown>("/auth/change-password", { body: change, signal });
      return parseResponse(sessionSchema, body);
    },
  };
}

// The refresh token cookie belongs to the API's domain, so the browser has to send and keep it.
export const authApi = createAuthApi(createApiClient({ credentials: "include" }));
