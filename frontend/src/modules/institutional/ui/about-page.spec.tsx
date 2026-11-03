import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { publicConfig } from "@/modules/core/config/env";
import { siteConfig } from "@/modules/core/config/site";
import { generalInquiryUrl } from "@/modules/whatsapp";

import { aboutContent } from "../content/about";
import { AboutPage } from "./AboutPage";

const INQUIRY = generalInquiryUrl(publicConfig.whatsappNumber);

describe("AboutPage", () => {
  it("has one h1 with the title and the highlighted word", () => {
    render(<AboutPage />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("La librería con nombre de sueño.");
    expect(within(headings[0]).getByText("sueño")).toHaveClass("font-script");
  });

  it("tells the story in the copy's paragraphs", () => {
    render(<AboutPage />);

    for (const paragraph of aboutContent.hero.paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it("offers the WhatsApp inquiry and the catalog from the hero", () => {
    render(<AboutPage />);

    const story = screen.getByRole("region", { name: "La librería con nombre de sueño." });
    const whatsapp = within(story).getByRole("link", { name: "Escribinos" });
    expect(whatsapp).toHaveAttribute("href", INQUIRY);
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(within(story).getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });

  it("lists the three values with their text", () => {
    render(<AboutPage />);

    const values = screen.getByRole("region", { name: "Lo que nos define" });
    expect(within(values).getAllByRole("listitem")).toHaveLength(3);
    for (const { title, text } of aboutContent.values.items) {
      expect(within(values).getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
      expect(within(values).getByText(text)).toBeInTheDocument();
    }
  });

  it("shows the address and each opening hours line of the site configuration", () => {
    render(<AboutPage />);

    const visit = screen.getByRole("region", { name: "¿Pasás a visitarnos?" });
    expect(within(visit).getByText(siteConfig.address)).toBeInTheDocument();
    for (const { days, time } of siteConfig.hours) {
      expect(within(visit).getByText(`${days} · ${time}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/dirección a confirmar/i)).not.toBeInTheDocument();
  });

  it("links the visit to WhatsApp and to Google Maps, both in a new tab", () => {
    render(<AboutPage />);

    const visit = screen.getByRole("region", { name: "¿Pasás a visitarnos?" });
    const contact = within(visit).getByRole("link", { name: "Hablar con la librería" });
    const directions = within(visit).getByRole("link", { name: "Cómo llegar" });
    expect(contact).toHaveAttribute("href", INQUIRY);
    expect(directions).toHaveAttribute("href", "https://maps.app.goo.gl/fEBdQFBgGmq7ve1v6");
    for (const link of [contact, directions]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
