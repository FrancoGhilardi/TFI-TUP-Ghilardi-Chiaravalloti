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

const errorBody = (statusCode: number, code: string, message: string, path: string) => ({
  timestamp: "2026-11-01T12:00:00.000Z",
  statusCode,
  code,
  message,
  path,
});

describe("forgotPassword", () => {
  it("posts the email and resolves on the empty 204 answer", async () => {
    const { api, fetchMock } = setup(() => new Response(null, { status: 204 }));

    await expect(api.forgotPassword("marta@libreriamisueno.com.ar")).resolves.toBeUndefined();

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe(`${BASE_URL}/auth/forgot-password`);
    expect(await request.json()).toEqual({ email: "marta@libreriamisueno.com.ar" });
  });

  it("fails with the API's error when it asks to wait", async () => {
    const { api } = setup(() =>
      json(errorBody(429, "TOO_MANY_REQUESTS", "x", "/auth/forgot-password"), 429, {
        "Retry-After": "120",
      }),
    );

    await expect(api.forgotPassword("marta@libreriamisueno.com.ar")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      retryAfter: 120,
    });
  });
});

describe("refresh", () => {
  it("posts with the cookie and gives back the renewed session", async () => {
    const { api, fetchMock } = setup(() => json(session));

    await expect(api.refresh()).resolves.toEqual(session);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe(`${BASE_URL}/auth/refresh`);
    expect(request.credentials).toBe("include");
  });

  it("fails when the answer is not a session", async () => {
    const { api } = setup(() => json({ accessToken: "" }));

    await expect(api.refresh()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

describe("changePassword", () => {
  const change = { currentPassword: "vieja-clave-1", newPassword: "nueva-clave-1" };

  it("sends both passwords with the access token and gives back the renewed session", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json(session));
    const api = createAuthApi(
      createApiClient({
        baseUrl: BASE_URL,
        credentials: "include",
        getAccessToken: () => "token-abc",
        fetch: fetchMock,
      }),
    );

    await expect(api.changePassword(change)).resolves.toEqual(session);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe(`${BASE_URL}/auth/change-password`);
    expect(request.headers.get("Authorization")).toBe("Bearer token-abc");
    expect(await request.json()).toEqual(change);
  });

  it("fails with the API's error when the current password is wrong", async () => {
    const { api } = setup(() =>
      json(
        errorBody(
          400,
          "INVALID_CURRENT_PASSWORD",
          "La contraseña actual no es correcta.",
          "/auth/change-password",
        ),
        400,
      ),
    );

    await expect(api.changePassword(change)).rejects.toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
      message: "La contraseña actual no es correcta.",
    });
  });
});

describe("logout", () => {
  it("posts with the cookie and resolves on the empty 204 answer", async () => {
    const { api, fetchMock } = setup(() => new Response(null, { status: 204 }));

    await expect(api.logout()).resolves.toBeUndefined();

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/auth/logout`);
    expect(request.credentials).toBe("include");
  });
});
