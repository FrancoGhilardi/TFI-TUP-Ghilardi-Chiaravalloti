import { describe, expect, it } from "vitest";

import { sitemapEntries } from "./sitemap";

const ORIGIN = "https://libreriamisueno.com.ar";

describe("sitemapEntries", () => {
  const entries = sitemapEntries(ORIGIN, {
    home: "/",
    pages: ["/productos", "/sobre-nosotros"],
    categories: ["/productos?categoria=escolar"],
    products: ["/productos/cuaderno-a4", "/productos/lapiz"],
  });

  it("lists the pages, then the categories, then every product, with absolute addresses", () => {
    expect(entries.map((entry) => entry.url)).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/productos`,
      `${ORIGIN}/sobre-nosotros`,
      `${ORIGIN}/productos?categoria=escolar`,
      `${ORIGIN}/productos/cuaderno-a4`,
      `${ORIGIN}/productos/lapiz`,
    ]);
  });

  it("weighs the home above the pages, and these above categories and products", () => {
    const priorities = entries.map((entry) => entry.priority);

    expect(priorities).toEqual([1, 0.8, 0.8, 0.7, 0.6, 0.6]);
  });

  it("gives a store with no products only its pages and categories", () => {
    const result = sitemapEntries(ORIGIN, { home: "/", pages: [], categories: [], products: [] });

    expect(result.map((entry) => entry.url)).toEqual([`${ORIGIN}/`]);
  });

  it("keeps the slugs as they are written, encoded", () => {
    const [, entry] = sitemapEntries(ORIGIN, {
      home: "/",
      pages: [],
      categories: [],
      products: ["/productos/lapiz%20negro"],
    });

    expect(entry.url).toBe(`${ORIGIN}/productos/lapiz%20negro`);
  });
});
