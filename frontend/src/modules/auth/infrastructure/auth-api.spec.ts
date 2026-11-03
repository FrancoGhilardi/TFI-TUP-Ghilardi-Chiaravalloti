import { describe, expect, it, vi } from "vitest";

import { ApiError, createApiClient } from "@/modules/core/http";

import { createAuthApi } from "./auth-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const session = {
  accessToken: "token-123",
  expiresIn: 900,
  user: {
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta",
    role: "ADMIN",
    mustChangePassword: false,
  },
};

function setup(respond: () => Response) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
  const api = createAuthApi(
    createApiClient({ baseUrl: BASE_URL, credentials: "include", fetch: fetchMock }),
  );
  return { api, fetchMock };
}

describe("login", () => {
  it("posts the credentials to the API and gives back the token and the user", async () => {
    const { api, fetchMock } = setup(() => json(session));

    await expect(
      api.login({ email: "marta@libreriamisueno.com.ar", password: "secreto123" }),
    ).resolves.toEqual(session);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/auth/login`);
    expect(await request.json()).toEqual({
      email: "marta@libreriamisueno.com.ar",
      password: "secreto123",
    });
    expect(request.credentials).toBe("include");
  });

  it("fails with the API's own message when the credentials are wrong", async () => {
    const { api } = setup(() =>
      json(
        {
          timestamp: "2026-11-01T12:00:00.000Z",
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
          message: "El email o la contraseña no son correctos.",
          path: "/auth/login",
        },
        401,
      ),
    );

    await expect(api.login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "El email o la contraseña no son correctos.",
    });
  });

  it("keeps how long to wait when there were too many attempts", async () => {
    const { api } = setup(() =>
      json(
        {
          timestamp: "2026-11-01T12:00:00.000Z",
          statusCode: 429,
          code: "TOO_MANY_REQUESTS",
          message: "Hiciste demasiados intentos.",
          path: "/auth/login",
        },
        429,
        { "Retry-After": "120" },
      ),
    );

    await expect(api.login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 429,
      code: "TOO_MANY_REQUESTS",
      retryAfter: 120,
    });
  });

  it("fails on a response of another shape instead of starting a session", async () => {
    const { api } = setup(() => json({ accessToken: "t", user: { role: "OWNER" } }));

    const failure = await api.login({ email: "a@b.com", password: "x" }).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});
