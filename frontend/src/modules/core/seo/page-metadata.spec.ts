import { describe, expect, it } from "vitest";

import { pageMetadata } from "./page-metadata";

const input = { title: "Productos", description: "Todo el catálogo.", path: "/productos" };

describe("pageMetadata", () => {
  it("sets the title, the description and the canonical path", () => {
    const metadata = pageMetadata(input);

    expect(metadata.title).toBe("Productos");
    expect(metadata.description).toBe("Todo el catálogo.");
    expect(metadata.alternates).toEqual({ canonical: "/productos" });
  });

  it("repeats the site name and locale in Open Graph, which replaces the layout's", () => {
    expect(pageMetadata(input).openGraph).toMatchObject({
      type: "website",
      siteName: "Librería Mi Sueño",
      locale: "es_AR",
      title: "Productos",
      url: "/productos",
    });
  });

  it("uses a large Twitter card only when there is an image", () => {
    const image = { url: "https://x/y.webp", alt: "Cuaderno" };

    expect(pageMetadata(input).twitter).toMatchObject({ card: "summary" });
    expect(pageMetadata({ ...input, image }).twitter).toMatchObject({
      card: "summary_large_image",
      images: [image],
    });
    expect(pageMetadata({ ...input, image }).openGraph).toMatchObject({ images: [image] });
  });

  it("asks not to index while following links, only when told", () => {
    expect(pageMetadata(input).robots).toBeUndefined();
    expect(pageMetadata({ ...input, noIndex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});
