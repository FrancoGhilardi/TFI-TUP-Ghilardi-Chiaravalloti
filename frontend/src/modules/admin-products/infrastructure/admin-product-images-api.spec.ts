import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminProductImagesApi } from "./admin-product-images-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const image = {
  id: "i1",
  position: 1,
  altText: "Tapa",
  mimeType: "image/png",
  sizeBytes: 1234,
  status: "PENDING",
  previewUrl: null,
  createdAt: "2026-11-01T12:00:00.000Z",
};

function setup(respond: () => Response) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
  const api = createAdminProductImagesApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
}

const png = (name = "a.png") => new File(["contenido"], name, { type: "image/png" });

describe("admin product images api", () => {
  it("lists the images by position with their state", async () => {
    const { api, requestOf } = setup(() =>
      json([
        image,
        {
          ...image,
          id: "i2",
          position: 2,
          status: "FAILED",
          altText: null,
          previewUrl: "https://s.test/i2",
        },
      ]),
    );

    const images = await api.list("p1");

    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images`);
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
    expect(
      images.map(({ id, status, altText, previewUrl }) => ({ id, status, altText, previewUrl })),
    ).toEqual([
      { id: "i1", status: "PENDING", altText: "Tapa", previewUrl: null },
      { id: "i2", status: "FAILED", altText: null, previewUrl: "https://s.test/i2" },
    ]);
  });

  it("fails on a list of another shape", async () => {
    const { api } = setup(() => json([{ id: "i1", status: "ROTA" }]));

    await expect(api.list("p1")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("adds an image with its alternative text, as a multipart request", async () => {
    const { api, requestOf } = setup(() => json(image, 201));

    await expect(api.add("p1", png(), " Tapa dura ")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("POST");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images`);
    const form = await requestOf().formData();
    expect((form.get("image") as File).name).toBe("a.png");
    expect(form.get("altText")).toBe("Tapa dura");
  });

  it("adds an image without an alternative text when it is blank", async () => {
    const { api, requestOf } = setup(() => json(image, 201));

    await api.add("p1", png(), "   ");

    expect((await requestOf().formData()).has("altText")).toBe(false);
  });

  it("sets the order with every image id", async () => {
    const { api, requestOf } = setup(() => json([image]));

    await api.reorder("p1", ["i2", "i1"]);

    expect(requestOf().method).toBe("PATCH");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images/order`);
    expect(await requestOf().json()).toEqual({ imageIds: ["i2", "i1"] });
  });

  it("changes the alternative text, and an empty one takes it away", async () => {
    const { api, requestOf } = setup(() => json(image));

    await api.changeAltText("p1", "i1", "  ");

    expect(requestOf().method).toBe("PATCH");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images/i1`);
    expect(await requestOf().json()).toEqual({ altText: "" });
  });

  it("replaces the file of an image", async () => {
    const { api, requestOf } = setup(() => json(image));

    await api.replaceFile("p1", "i1", png("nueva.png"));

    expect(requestOf().method).toBe("PUT");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images/i1/file`);
    expect(((await requestOf().formData()).get("image") as File).name).toBe("nueva.png");
  });

  it("retries the processing of an image", async () => {
    const { api, requestOf } = setup(() => json(image));

    await api.retry("p1", "i1");

    expect(requestOf().method).toBe("POST");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images/i1/retry`);
  });

  it("deletes an image and resolves on the empty 204 answer", async () => {
    const { api, requestOf } = setup(() => new Response(null, { status: 204 }));

    await expect(api.remove("p1", "i1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("DELETE");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/images/i1`);
  });

  it("fails with the API's refusal, such as deleting the last image", async () => {
    const { api } = setup(() =>
      json(
        {
          timestamp: "2026-11-01T12:00:00.000Z",
          statusCode: 422,
          code: "LAST_PRODUCT_IMAGE",
          message: "El producto necesita al menos una imagen.",
          path: "/admin/products/p1/images/i1",
        },
        422,
      ),
    );

    await expect(api.remove("p1", "i1")).rejects.toMatchObject({
      status: 422,
      code: "LAST_PRODUCT_IMAGE",
      message: "El producto necesita al menos una imagen.",
    });
  });
});
