import { describe, expect, it } from "vitest";

import { generalInquiryUrl, productInquiryUrl } from "./inquiry-links";

describe("generalInquiryUrl", () => {
  it("opens a chat with the store and the greeting", () => {
    const url = new URL(generalInquiryUrl("5492622380159"));

    expect(url.origin + url.pathname).toBe("https://wa.me/5492622380159");
    expect(url.searchParams.get("text")).toBe(
      "¡Hola Librería Mi Sueño! Quería hacer una consulta.",
    );
  });
});

describe("productInquiryUrl", () => {
  const product = {
    title: "Cuaderno A4 & más",
    price: "9800.00",
    href: "http://localhost:3000/productos/cuaderno-a4",
  };

  it("names the product, its price and the link to its page", () => {
    const url = new URL(productInquiryUrl("5492622380159", product));

    expect(url.origin + url.pathname).toBe("https://wa.me/5492622380159");
    expect(url.searchParams.get("text")).toBe(
      "¡Hola Librería Mi Sueño! Quería consultar por «Cuaderno A4 & más» ($\u00a09.800): http://localhost:3000/productos/cuaderno-a4",
    );
  });

  it("shows cents when the price has them", () => {
    const url = new URL(productInquiryUrl("5492622380159", { ...product, price: "1500.50" }));

    expect(url.searchParams.get("text")).toContain("($\u00a01.500,50)");
  });
});
