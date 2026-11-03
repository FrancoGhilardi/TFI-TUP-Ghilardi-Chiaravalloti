import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";

import type { SearchSuggestions } from "../domain/search-term";
import { searchStore } from "../infrastructure/search-api";
import { StoreSearch } from "./StoreSearch";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../infrastructure/search-api", () => ({ searchStore: vi.fn() }));

const answer: SearchSuggestions = {
  products: [
    {
      id: "p1",
      slug: "cuaderno-a4",
      title: "Cuaderno A4",
      price: "9800.00",
      salePrice: null,
      isOnSale: false,
      isNew: false,
      isFeatured: false,
      image: {
        url: "http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp",
        alt: "Cuaderno A4",
        optimizable: true,
      },
      category: null,
    },
  ],
  categories: [{ id: "c1", name: "Cuadernos", slug: "cuadernos" }],
};

const renderSearch = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } })}
    >
      <StoreSearch />
    </QueryClientProvider>,
  );

const openPanel = async () => {
  const user = userEvent.setup();
  renderSearch();
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  return { user, field: screen.getByRole("searchbox", { name: "Buscar productos y categorías" }) };
};

describe("StoreSearch", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(searchStore).mockReset();
    vi.mocked(searchStore).mockResolvedValue(answer);
  });

  it("opens a dialog with the field focused and closes it with Escape, returning the focus", async () => {
    const { user, field } = await openPanel();

    expect(screen.getByRole("dialog", { name: "Buscar" })).toBeInTheDocument();
    expect(field).toHaveFocus();
    expect(screen.getByText("Escribí al menos 2 letras o números.")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveFocus();
  });

  it("searches once after the pause and shows the suggestions", async () => {
    const { user, field } = await openPanel();

    await user.type(field, "cuad");
    expect(searchStore).not.toHaveBeenCalled();

    expect(await screen.findByRole("link", { name: /Cuaderno A4/ })).toHaveAttribute(
      "href",
      "/productos/cuaderno-a4",
    );
    expect(searchStore).toHaveBeenCalledOnce();
    expect(searchStore).toHaveBeenCalledWith("cuad", expect.any(AbortSignal));
    expect(screen.getByRole("status")).toHaveTextContent("1 producto y 1 categoría");
  });

  it("closes the panel when a result is chosen", async () => {
    const { user, field } = await openPanel();
    await user.type(field, "cuad");

    await user.click(await screen.findByRole("link", { name: "Cuadernos" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("goes to the catalog with the trimmed term alone on Enter, without waiting for the pause", async () => {
    const { user, field } = await openPanel();

    await user.type(field, "  lápiz  {Enter}");

    expect(push).toHaveBeenCalledWith("/productos?q=l%C3%A1piz");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does nothing on Enter below two characters", async () => {
    const { user, field } = await openPanel();

    await user.type(field, " a {Enter}");

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(searchStore).not.toHaveBeenCalled();
  });

  it("shows the failure and searches again on retry", async () => {
    vi.mocked(searchStore).mockRejectedValueOnce(
      new ApiError({ status: 429, code: "TOO_MANY_REQUESTS", message: "Demasiados intentos" }),
    );
    const { user, field } = await openPanel();
    await user.type(field, "cuad");

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos buscar ahora");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("link", { name: /Cuaderno A4/ })).toBeInTheDocument();
    expect(searchStore).toHaveBeenCalledTimes(2);
  });

  it("turns the hint into an alert and marks the field when Enter comes with too little text", async () => {
    const { user, field } = await openPanel();

    await user.type(field, "a{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Escribí al menos 2 letras o números.");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();

    await user.type(field, "b");

    expect(field).toHaveAttribute("aria-invalid", "false");
  });

  it("keeps the panel open when a result is opened with a modified click", async () => {
    const { user, field } = await openPanel();
    await user.type(field, "cuad");
    const link = await screen.findByRole("link", { name: "Cuadernos" });

    await user.keyboard("{Control>}");
    await user.click(link);
    await user.keyboard("{/Control}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("limits the field to 100 characters", async () => {
    const { field } = await openPanel();

    expect(field).toHaveAttribute("maxlength", "100");
  });
});
