import { describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error";
import { type ApiClientOptions, createApiClient } from "./client";

const BASE_URL = "http://api.test/api/v1";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function errorResponse(status: number, code: string, message = "Error de la API.") {
  return jsonResponse(
    { timestamp: "2026-11-01T12:00:00.000Z", statusCode: status, code, message, path: "/x" },
    status,
  );
}

function setup(options: Omit<ApiClientOptions, "fetch"> = {}) {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => jsonResponse({ ok: true }));
  const client = createApiClient({ baseUrl: BASE_URL, ...options, fetch: fetchMock });
  const call = (index = 0) => {
    const [url, init] = fetchMock.mock.calls[index];
    return { url: String(url), init: init ?? {}, headers: new Headers(init?.headers) };
  };
  return { client, fetchMock, call };
}

/** A fetch that never answers, rejecting like the real one when its signal aborts. */
function hangingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(signal.reason);
      }
      signal?.addEventListener("abort", () => reject(signal.reason));
    });
}

describe("createApiClient", () => {
  describe("request", () => {
    it("joins the path and the query to the base URL, leaving out undefined values", async () => {
      const { client, call } = setup();

      await client.get("/products", {
        query: { q: "lápiz", page: 2, onSale: true, category: undefined },
      });

      expect(call().url).toBe(`${BASE_URL}/products?q=l%C3%A1piz&page=2&onSale=true`);
      expect(call().init.method).toBe("GET");
      expect(call().headers.get("Accept")).toBe("application/json");
    });

    it("sends an object body as JSON", async () => {
      const { client, call } = setup();

      await client.post("/auth/login", { body: { email: "a@b.com" } });

      expect(call().init.method).toBe("POST");
      expect(call().init.body).toBe('{"email":"a@b.com"}');
      expect(call().headers.get("Content-Type")).toBe("application/json");
    });

    it("sends FormData as is, leaving the Content-Type to the runtime", async () => {
      const { client, call } = setup();
      const form = new FormData();
      form.append("title", "Cuaderno");

      await client.post("/admin/products", { body: form });

      expect(call().init.body).toBe(form);
      expect(call().headers.has("Content-Type")).toBe(false);
    });

    it("passes the Next.js cache options and credentials through", async () => {
      const { client, call } = setup();

      await client.get("/products/featured", { next: { revalidate: 60, tags: ["products"] } });
      await client.post("/auth/refresh", { cache: "no-store", credentials: "include" });

      expect(call(0).init.next).toEqual({ revalidate: 60, tags: ["products"] });
      expect(call(1).init).toMatchObject({ cache: "no-store", credentials: "include" });
    });

    it("applies the instance's credentials and headers, letting the request override them", async () => {
      const { client, call } = setup({
        credentials: "include",
        headers: { "X-Client": "admin", "X-Trace": "instance" },
      });

      await client.get("/admin/products", { headers: { "X-Trace": "request" } });
      await client.get("/products", { credentials: "omit" });

      expect(call(0).init.credentials).toBe("include");
      expect(call(0).headers.get("X-Client")).toBe("admin");
      expect(call(0).headers.get("X-Trace")).toBe("request");
      expect(call(1).init.credentials).toBe("omit");
    });

    it("rejects a path without a leading slash before sending anything", async () => {
      const { client, fetchMock } = setup();

      await expect(client.get("products")).rejects.toThrow(TypeError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("response", () => {
    it("returns the parsed body", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(jsonResponse([{ slug: "cuaderno" }]));

      await expect(client.get("/products/featured")).resolves.toEqual([{ slug: "cuaderno" }]);
    });

    it("returns undefined for 204", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await expect(client.delete("/admin/products/1")).resolves.toBeUndefined();
    });

    it("rejects a success response whose body is not JSON", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(new Response("<html></html>", { status: 200 }));

      await expect(client.get("/products")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    });

    it("throws the API error with its own message for a domain error", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(
        errorResponse(404, "PRODUCT_NOT_FOUND", "El producto no existe."),
      );

      const error = await client.get("/products/x").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 404,
        code: "PRODUCT_NOT_FOUND",
        message: "El producto no existe.",
      });
    });

    it("applies the caller's message overrides", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(errorResponse(404, "PRODUCT_NOT_FOUND"));

      await expect(
        client.get("/products/x", { errorMessages: { PRODUCT_NOT_FOUND: "Ya no está." } }),
      ).rejects.toMatchObject({ message: "Ya no está." });
    });
  });

  describe("failures without a response", () => {
    it("reports a network failure", async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      await expect(client.get("/products")).rejects.toMatchObject({
        status: 0,
        code: "NETWORK_ERROR",
      });
    });

    it("reports a timeout", async () => {
      const client = createApiClient({ baseUrl: BASE_URL, fetch: hangingFetch() });

      await expect(client.get("/products", { timeoutMs: 10 })).rejects.toMatchObject({
        code: "TIMEOUT",
      });
    });

    it("reports a timeout while reading the error body", async () => {
      const client = createApiClient({
        baseUrl: BASE_URL,
        fetch: async (_input, init) => {
          const body = new ReadableStream({
            start: (controller) =>
              init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason)),
          });
          return new Response(body, { status: 500 });
        },
      });

      await expect(client.get("/products", { timeoutMs: 10 })).rejects.toMatchObject({
        code: "TIMEOUT",
      });
    });

    it("reports a timeout while waiting for the access token", async () => {
      const { client, fetchMock } = setup({ getAccessToken: () => new Promise(() => undefined) });

      await expect(client.get("/admin/products", { timeoutMs: 10 })).rejects.toMatchObject({
        code: "TIMEOUT",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("lets a cancellation by the caller through untouched", async () => {
      const client = createApiClient({ baseUrl: BASE_URL, fetch: hangingFetch() });
      const controller = new AbortController();

      const request = client.get("/products", { signal: controller.signal });
      controller.abort();

      const error = await request.catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ name: "AbortError" });
    });
  });

  describe("authentication", () => {
    it("sends the access token when there is one", async () => {
      const { client, call } = setup({ getAccessToken: () => "token-1" });

      await client.get("/admin/products");

      expect(call().headers.get("Authorization")).toBe("Bearer token-1");
    });

    it("sends no Authorization header without a token", async () => {
      const { client, call } = setup({ getAccessToken: () => undefined });

      await client.get("/products");

      expect(call().headers.has("Authorization")).toBe(false);
    });

    it("retries once with the new token when the session is renewed", async () => {
      let token = "expired";
      const onUnauthorized = vi.fn(async () => {
        token = "renewed";
        return true;
      });
      const { client, fetchMock, call } = setup({ getAccessToken: () => token, onUnauthorized });
      fetchMock
        .mockResolvedValueOnce(errorResponse(401, "INVALID_ACCESS_TOKEN"))
        .mockResolvedValueOnce(jsonResponse({ id: 1 }));

      await expect(client.get("/auth/me")).resolves.toEqual({ id: 1 });
      expect(onUnauthorized).toHaveBeenCalledOnce();
      expect(call(1).headers.get("Authorization")).toBe("Bearer renewed");
    });

    it("throws the 401 when the session cannot be renewed", async () => {
      const onUnauthorized = vi.fn(async () => false);
      const { client, fetchMock } = setup({ getAccessToken: () => "expired", onUnauthorized });
      fetchMock.mockResolvedValue(errorResponse(401, "INVALID_ACCESS_TOKEN"));

      await expect(client.get("/auth/me")).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("does not retry a second time", async () => {
      const onUnauthorized = vi.fn(async () => true);
      const { client, fetchMock } = setup({ getAccessToken: () => "token", onUnauthorized });
      fetchMock.mockImplementation(async () => errorResponse(401, "INVALID_ACCESS_TOKEN"));

      await expect(client.get("/auth/me")).rejects.toMatchObject({ status: 401 });
      expect(onUnauthorized).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("renews the session once for concurrent 401s and retries all of them", async () => {
      let token = "expired";
      let finishRenewal: (renewed: boolean) => void = () => undefined;
      const onUnauthorized = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            finishRenewal = (renewed) => {
              token = "renewed";
              resolve(renewed);
            };
          }),
      );
      const { client, fetchMock, call } = setup({ getAccessToken: () => token, onUnauthorized });
      fetchMock.mockImplementation(async (_input, init) =>
        new Headers(init?.headers).get("Authorization") === "Bearer renewed"
          ? jsonResponse({ ok: true })
          : errorResponse(401, "INVALID_ACCESS_TOKEN"),
      );

      const requests = Promise.all([
        client.get("/admin/products"),
        client.get("/admin/categories"),
        client.get("/auth/me"),
      ]);
      await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
      finishRenewal(true);

      await expect(requests).resolves.toHaveLength(3);
      expect(onUnauthorized).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(call(5).headers.get("Authorization")).toBe("Bearer renewed");
    });

    it("retries without renewing when another request already renewed the session", async () => {
      const tokens = ["expired", "renewed", "renewed"];
      const onUnauthorized = vi.fn(async () => true);
      const { client, fetchMock, call } = setup({
        getAccessToken: () => tokens.shift(),
        onUnauthorized,
      });
      fetchMock
        .mockResolvedValueOnce(errorResponse(401, "INVALID_ACCESS_TOKEN"))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      await expect(client.get("/auth/me")).resolves.toEqual({ ok: true });
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(call(1).headers.get("Authorization")).toBe("Bearer renewed");
    });

    it("throws the 401 when the renewal fails", async () => {
      const onUnauthorized = vi.fn(async () => {
        throw new Error("refresh failed");
      });
      const { client, fetchMock } = setup({ getAccessToken: () => "expired", onUnauthorized });
      fetchMock.mockImplementation(async () => errorResponse(401, "INVALID_ACCESS_TOKEN"));

      await expect(client.get("/auth/me")).rejects.toMatchObject({
        status: 401,
        code: "INVALID_ACCESS_TOKEN",
      });
    });

    it("bounds a hanging renewal by the request timeout", async () => {
      const onUnauthorized = vi.fn(() => new Promise<boolean>(() => undefined));
      const { client, fetchMock } = setup({ getAccessToken: () => "expired", onUnauthorized });
      fetchMock.mockImplementation(async () => errorResponse(401, "INVALID_ACCESS_TOKEN"));

      await expect(client.get("/auth/me", { timeoutMs: 20 })).rejects.toMatchObject({
        code: "TIMEOUT",
      });
    });

    it("discards the rejected response before retrying", async () => {
      const rejected = errorResponse(401, "INVALID_ACCESS_TOKEN");
      const cancel = vi.spyOn(rejected.body as ReadableStream, "cancel");
      let token = "expired";
      const { client, fetchMock } = setup({
        getAccessToken: () => token,
        onUnauthorized: async () => {
          token = "renewed";
          return true;
        },
      });
      fetchMock.mockResolvedValueOnce(rejected).mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.get("/auth/me");

      expect(cancel).toHaveBeenCalled();
    });

    it("leaves a 401 of an anonymous request, such as a failed login, to the caller", async () => {
      const onUnauthorized = vi.fn(async () => true);
      const { client, fetchMock } = setup({ getAccessToken: () => undefined, onUnauthorized });
      fetchMock.mockResolvedValue(errorResponse(401, "INVALID_CREDENTIALS", "Datos incorrectos."));

      await expect(client.post("/auth/login")).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });
});
