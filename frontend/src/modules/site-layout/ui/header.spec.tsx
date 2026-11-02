import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryNode } from "@/modules/catalog";

import { CartButton } from "./CartButton";
import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

const category = (slug: string, name: string): CategoryNode => ({
  id: slug,
  name,
  slug,
  description: null,
  children: [],
});

const categories = [category("libros", "Libros"), category("arte", "Arte y pintura")];
const whatsappUrl = "https://wa.me/5492622380159?text=hola";

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
});

describe("DesktopNav", () => {
  it("marks the current section", () => {
    vi.mocked(usePathname).mockReturnValue("/sobre-nosotros");

    render(<DesktopNav categories={categories} />);

    expect(screen.getByRole("link", { name: "Sobre nosotros" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
  });

  it("opens the categories with the keyboard and closes them with Escape", async () => {
    const user = userEvent.setup();
    render(<DesktopNav categories={categories} />);

    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Productos" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Ver todo" })).toHaveAttribute("href", "/productos");
    expect(screen.getByRole("link", { name: "Arte y pintura" })).toHaveAttribute(
      "href",
      "/productos?categoria=arte",
    );

    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});

describe("DesktopNav arrow keys", () => {
  it("moves between every top-level item with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<DesktopNav categories={categories} />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Productos" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("link", { name: "Sobre nosotros" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveFocus();
  });
});

describe("MobileMenu", () => {
  it("opens with the keyboard, lists sections, categories and WhatsApp, and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<MobileMenu categories={categories} whatsappUrl={whatsappUrl} />);

    const trigger = screen.getByRole("button", { name: "Abrir menú" });
    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Menú" });
    const nav = within(dialog).getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Libros" })).toHaveAttribute(
      "href",
      "/productos?categoria=libros",
    );
    const whatsapp = within(dialog).getByRole("link", { name: "Consultar por WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", whatsappUrl);
    expect(whatsapp).toHaveAttribute("target", "_blank");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("MobileMenu on a wider viewport", () => {
  it("closes when the viewport reaches the desktop navigation", async () => {
    const listeners: ((event: MediaQueryListEvent) => void)[] = [];
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: false,
          media: query,
          addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.push(listener),
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const user = userEvent.setup();
    render(<MobileMenu categories={categories} whatsappUrl={whatsappUrl} />);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("dialog", { name: "Menú" })).toBeInTheDocument();

    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.mocked(window.matchMedia).mockRestore();
  });
});

describe("CartButton", () => {
  it("shows no badge and a plain name when the cart is empty", () => {
    render(<CartButton count={0} />);

    const button = screen.getByRole("button", { name: "Abrir carrito" });
    expect(button).not.toHaveTextContent(/\d/);
  });

  it("shows the badge and says the exact count", () => {
    render(<CartButton count={12} />);

    const button = screen.getByRole("button", { name: "Abrir carrito, 12 productos" });
    expect(button).toHaveTextContent("9+");
  });

  it("calls its handler when pressed", async () => {
    const onClick = vi.fn();
    render(<CartButton count={1} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
