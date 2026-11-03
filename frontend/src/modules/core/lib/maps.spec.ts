import { describe, expect, it } from "vitest";

import { siteConfig } from "../config/site";
import { mapsSearchUrl } from "./maps";

describe("mapsSearchUrl", () => {
  it("searches the text, encoding accents, commas and spaces", () => {
    const url = new URL(mapsSearchUrl("Librería Mi Sueño, Mendoza"));

    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("Librería Mi Sueño, Mendoza");
  });
});

describe("siteConfig.mapsUrl", () => {
  it("searches the store by its name and city", () => {
    expect(new URL(siteConfig.mapsUrl).searchParams.get("query")).toBe(
      "Librería Mi Sueño, Mendoza, Argentina",
    );
  });
});
