import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminUsersApi } from "./admin-users-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorBody = (statusCode: number, code: string, message: string) => ({
  timestamp: "2026-11-01T12:00:00.000Z",
  statusCode,
  code,
  message,
  path: "/admin/users",
});

const row = {
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta Gómez",
  role: "SELLER",
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: "2026-11-02T09:30:00.000Z",
  createdAt: "2026-01-02T12:00:00.000Z",
  updatedAt: "2026-11-02T12:00:00.000Z",
  deletedAt: null,
};

function setup(respond: () => Response) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
  const api = createAdminUsersApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
}

describe("admin users api list", () => {
  it("sends only the parameters it is given, with the access token", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ q: "marta", role: "SELLER", status: "DELETED", page: 2, limit: 20 });

    const url = new URL(requestOf().url);
    expect(url.pathname).toBe("/api/v1/admin/users");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "marta",
      role: "SELLER",
      status: "DELETED",
      page: "2",
      limit: "20",
    });
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("leaves out what is not set", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ page: 1, limit: 20, q: undefined, role: undefined, status: undefined });

    expect(Object.fromEntries(new URL(requestOf().url).searchParams)).toEqual({
      page: "1",
      limit: "20",
    });
  });

  it("maps each user, with its dates as dates and the missing ones as null", async () => {
    const { api } = setup(() =>
      json({
        items: [
          row,
          { ...row, id: "u2", lastLoginAt: null, deletedAt: "2026-11-03T10:00:00.000Z" },
        ],
        totalItems: 41,
      }),
    );

    const page = await api.list({});

    expect(page.total).toBe(41);
    expect(page.items[0]).toMatchObject({ id: "u1", role: "SELLER", mustChangePassword: false });
    expect(page.items[0].lastLoginAt).toEqual(new Date("2026-11-02T09:30:00.000Z"));
    expect(page.items[0].createdAt).toBeInstanceOf(Date);
    expect(page.items[1].lastLoginAt).toBeNull();
    expect(page.items[1].deletedAt).toEqual(new Date("2026-11-03T10:00:00.000Z"));
  });

  it("fails on a user with a role it does not know", async () => {
    const { api } = setup(() => json({ items: [{ ...row, role: "OWNER" }], totalItems: 1 }));

    await expect(api.list({})).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("fails on a response without items", async () => {
    const { api } = setup(() => json({ totalItems: 1 }));

    await expect(api.list({})).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

describe("admin users api get", () => {
  it("reads one user by its id, escaped in the path", async () => {
    const { api, requestOf } = setup(() => json(row));

    await expect(api.get("u/1")).resolves.toMatchObject({ id: "u1", name: "Marta Gómez" });

    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users/u%2F1");
  });

  it("keeps the code and message when the user does not exist", async () => {
    const { api } = setup(() =>
      json(errorBody(404, "USER_NOT_FOUND", "No existe ese usuario."), 404),
    );

    await expect(api.get("u1")).rejects.toMatchObject({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "No existe ese usuario.",
    });
  });
});

describe("admin users api writes", () => {
  it("creates with the request as the body, without reading the answer", async () => {
    const { api, requestOf } = setup(() => json(row, 201));

    await api.create({
      email: "ana@dominio.com",
      name: "Ana",
      role: "ADMIN",
      temporaryPassword: "clave-temporal-1",
    });

    expect(requestOf().method).toBe("POST");
    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users");
    expect(await requestOf().json()).toEqual({
      email: "ana@dominio.com",
      name: "Ana",
      role: "ADMIN",
      temporaryPassword: "clave-temporal-1",
    });
  });

  it("updates with only the changes as the body", async () => {
    const { api, requestOf } = setup(() => json(row));

    await api.update("u1", { role: "ADMIN", isActive: false });

    expect(requestOf().method).toBe("PATCH");
    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users/u1");
    expect(await requestOf().json()).toEqual({ role: "ADMIN", isActive: false });
  });

  it("deletes with the id in the path and resolves on the empty 204 answer", async () => {
    const { api, requestOf } = setup(() => new Response(null, { status: 204 }));

    await expect(api.remove("u1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("DELETE");
    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users/u1");
  });

  it("restores with a POST to the restore path", async () => {
    const { api, requestOf } = setup(() => json(row));

    await api.restore("u1");

    expect(requestOf().method).toBe("POST");
    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users/u1/restore");
  });

  it("resets the password with a POST without a body, and resolves on the empty 204 answer", async () => {
    const { api, requestOf } = setup(() => new Response(null, { status: 204 }));

    await expect(api.resetPassword("u1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("POST");
    expect(new URL(requestOf().url).pathname).toBe("/api/v1/admin/users/u1/reset-password");
    expect(await requestOf().text()).toBe("");
  });

  it.each([
    [422, "SELF_ADMINISTRATION", "No podés darte de baja a vos mismo."],
    [422, "LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo."],
    [502, "MAIL_DELIVERY_FAILED", "No pudimos enviar el mail."],
    [409, "EMAIL_ALREADY_IN_USE", "Ese email ya está en uso."],
  ])("keeps the code and message of a refusal (%i %s)", async (status, code, message) => {
    const { api } = setup(() => json(errorBody(status, code, message), status));

    await expect(api.remove("u1")).rejects.toMatchObject({ status, code, message });
  });
});
