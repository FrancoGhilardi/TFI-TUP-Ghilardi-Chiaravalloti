import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CategoryNode } from "@/modules/catalog";

import { SiteFooter } from "./SiteFooter";

const category = (slug: string): CategoryNode => ({
  id: slug,
  name: slug.toUpperCase(),
  slug,
  description: null,
  children: [],
});

const whatsappUrl = "https://wa.me/5492622380159?text=hola";

function storeColumn() {
  return within(screen.getByRole("region", { name: "Tienda" }));
}

describe("SiteFooter", () => {
  it("lists the catalog and at most four first-level categories", () => {
    const categories = ["libros", "escolar", "arte", "regalos", "mochilas"].map(category);

    render(<SiteFooter categories={categories} whatsappUrl={whatsappUrl} />);

    const links = storeColumn().getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/productos",
      "/productos?categoria=libros",
      "/productos?categoria=escolar",
      "/productos?categoria=arte",
      "/productos?categoria=regalos",
    ]);
  });

  it("still links to the catalog without categories", () => {
    render(<SiteFooter categories={[]} whatsappUrl={whatsappUrl} />);

    expect(storeColumn().getAllByRole("link")).toHaveLength(1);
    expect(storeColumn().getByRole("link", { name: "Productos" })).toBeInTheDocument();
  });

  it("names the social links and opens them in a new tab", () => {
    render(<SiteFooter categories={[]} whatsappUrl={whatsappUrl} />);

    for (const name of ["Instagram", "WhatsApp"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", whatsappUrl);
  });

  it("shows the configured WhatsApp number next to its chat link", () => {
    render(<SiteFooter categories={[]} whatsappUrl={whatsappUrl} />);

    expect(screen.getByRole("link", { name: "WhatsApp: 2622 38-0159" })).toHaveAttribute(
      "href",
      whatsappUrl,
    );
  });
});
