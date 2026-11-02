import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DaisyMark } from "./DaisyMark";
import { ExternalLink } from "./ExternalLink";
import { InstagramIcon } from "./icons/InstagramIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { SkipLink } from "./SkipLink";

describe("SkipLink", () => {
  it("is the first stop of the keyboard and points to the main content", async () => {
    render(
      <>
        <SkipLink targetId="contenido" />
        <button type="button">Abrir menú</button>
        <main id="contenido" tabIndex={-1} />
      </>,
    );

    await userEvent.tab();

    const link = screen.getByRole("link", { name: "Saltar al contenido" });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "#contenido");
  });
});

describe("decorative graphics", () => {
  it.each([
    ["DaisyMark", <DaisyMark key="daisy" />],
    ["WhatsAppIcon", <WhatsAppIcon key="wa" />],
    ["InstagramIcon", <InstagramIcon key="ig" />],
  ])("hides %s from assistive technology", (_name, element) => {
    const { container } = render(element);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ExternalLink", () => {
  it("opens in a new tab without exposing this page", () => {
    render(<ExternalLink href="https://wa.me/1">WhatsApp</ExternalLink>);

    const link = screen.getByRole("link", { name: "WhatsApp" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
