import { describe, expect, it } from "vitest";

import { generalInquiryUrl } from "./inquiry-links";

describe("generalInquiryUrl", () => {
  it("opens a chat with the store and the greeting", () => {
    const url = new URL(generalInquiryUrl("5492622380159"));

    expect(url.origin + url.pathname).toBe("https://wa.me/5492622380159");
    expect(url.searchParams.get("text")).toBe(
      "¡Hola Librería Mi Sueño! Quería hacer una consulta.",
    );
  });
});
