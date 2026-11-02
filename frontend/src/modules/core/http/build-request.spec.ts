import { describe, expect, it } from "vitest";

import { buildBody, buildUrl, mergeHeaders } from "./build-request";

const BASE_URL = "http://api.test/api/v1";

describe("buildUrl", () => {
  it("joins the path and the query, leaving out undefined values", () => {
    expect(buildUrl(BASE_URL, "/products", { q: "lápiz", page: 2, category: undefined })).toBe(
      `${BASE_URL}/products?q=l%C3%A1piz&page=2`,
    );
  });

  it("rejects a path without a leading slash", () => {
    expect(() => buildUrl(BASE_URL, "products")).toThrow(TypeError);
  });
});

describe("mergeHeaders", () => {
  it("lets later sources win", () => {
    const headers = mergeHeaders({ "X-Client": "shop", "X-A": "1" }, { "X-A": "2" }, undefined);

    expect(Object.fromEntries(headers)).toEqual({ "x-client": "shop", "x-a": "2" });
  });
});

describe("buildBody", () => {
  it("returns nothing without a body", () => {
    expect(buildBody(undefined, new Headers())).toBeUndefined();
  });

  it.each([{ email: "a@b.com" }, [1, 2], Object.create(null) as object])(
    "sends %o as JSON",
    (body) => {
      const headers = new Headers();

      expect(buildBody(body, headers)).toBe(JSON.stringify(body));
      expect(headers.get("Content-Type")).toBe("application/json");
    },
  );

  it("keeps a Content-Type given by the caller for JSON", () => {
    const headers = new Headers({ "Content-Type": "application/merge-patch+json" });

    buildBody({ title: "x" }, headers);

    expect(headers.get("Content-Type")).toBe("application/merge-patch+json");
  });

  it("sends FormData as is, dropping any Content-Type so the runtime adds the boundary", () => {
    const headers = new Headers({ "Content-Type": "multipart/form-data" });
    const form = new FormData();

    expect(buildBody(form, headers)).toBe(form);
    expect(headers.has("Content-Type")).toBe(false);
  });

  it.each([
    ["a Blob", new Blob(["image"], { type: "image/png" })],
    ["URLSearchParams", new URLSearchParams({ a: "1" })],
    ["an ArrayBuffer", new ArrayBuffer(4)],
    ["a string", "raw"],
  ])("sends %s as is", (_name, body) => {
    const headers = new Headers();

    expect(buildBody(body, headers)).toBe(body);
    expect(headers.has("Content-Type")).toBe(false);
  });
});
