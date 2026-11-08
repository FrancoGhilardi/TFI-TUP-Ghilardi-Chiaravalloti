import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoriesTotal } from "@/modules/admin-categories";
import {
  type AdminProductSummary,
  useLatestProducts,
  useLowStockProducts,
  useProductsTotal,
} from "@/modules/admin-products";
import { useSessionStore } from "@/modules/auth/application/session-store";

import { HomePage } from "./HomePage";

vi.mock("@/modules/admin-products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/admin-products")>()),
  useProductsTotal: vi.fn(),
  useLatestProducts: vi.fn(),
  useLowStockProducts: vi.fn(),
}));
vi.mock("@/modules/admin-categories", () => ({ useCategoriesTotal: vi.fn() }));

const product = (overrides: Partial<AdminProductSummary> = {}): AdminProductSummary => ({
  id: "p1",
  sku: "LMS-000001",
  title: "Cuaderno rayado",
  stock: 3,
  isActive: true,
  thumbnailUrl: null,
  updatedAt: new Date(Date.now() - 5 * 60 * 1000),
  ...overrides,
});

interface Loaded<T> {
  data?: T;
  isPending?: boolean;
  isError?: boolean;
  dataUpdatedAt?: number;
  refetch?: () => void;
}

const query = <T,>({
  data,
  isPending = false,
  isError = false,
  dataUpdatedAt = Date.now(),
  refetch = vi.fn(),
}: Loaded<T>) => ({ data, isPending, isError, dataUpdatedAt, refetch }) as never;

const givenTotals = ({
  active = 12,
  inactive = 3,
  categories = 5,
}: {
  active?: Loaded<number>["data"] | Loaded<number>;
  inactive?: number;
  categories?: number;
} = {}) => {
  vi.mocked(useProductsTotal).mockImplementation(((status?: string) =>
    query({ data: status === "ACTIVE" ? (active as number) : inactive })) as never);
  vi.mocked(useCategoriesTotal).mockReturnValue(query({ data: categories }));
};

const signIn = (role: "ADMIN" | "SELLER", name = "Marta Gómez") =>
  act(() =>
    useSessionStore.getState().start({
      accessToken: "token",
      expiresIn: 900,
      user: { id: "u1", email: "m@libreriamisueno.com.ar", name, role, mustChangePassword: false },
    }),
  );

beforeEach(() => {
  givenTotals();
  vi.mocked(useLatestProducts).mockReturnValue(query({ data: [product()] }));
  vi.mocked(useLowStockProducts).mockReturnValue(
    query({ data: { total: 2, items: [product({ id: "p2", title: "Lápiz negro", stock: 0 })] } }),
  );
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("HomePage", () => {
  it("greets the person by their first name", () => {
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("¡Hola, Marta!");
  });

  it("shows the four numbers, each leading to its section", () => {
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /Productos activos/ })).toHaveTextContent("12");
    expect(screen.getByRole("link", { name: /Productos inactivos/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Con stock bajo \(≤ 5\)/ })).toHaveTextContent("2");
    const categories = screen.getByRole("link", { name: /Categorías activas/ });
    expect(categories).toHaveTextContent("5");
    expect(categories).toHaveAttribute("href", "/admin/categorias");
    expect(screen.getByRole("link", { name: /Productos activos/ })).toHaveAttribute(
      "href",
      "/admin/productos",
    );
  });

  it("lists the latest modified products with their SKU, how long ago and their state", () => {
    vi.mocked(useLatestProducts).mockReturnValue(
      query({
        data: [
          product(),
          product({ id: "p3", title: "Regla", sku: "LMS-000003", isActive: false }),
        ],
      }),
    );
    signIn("ADMIN");
    render(<HomePage />);

    const panel = screen.getByRole("region", { name: "Últimos productos modificados" });
    const rows = within(panel).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Cuaderno rayado");
    expect(rows[0]).toHaveTextContent("LMS-000001 · hace 5 minutos");
    expect(rows[0]).toHaveTextContent("Activo");
    expect(rows[1]).toHaveTextContent("Inactivo");
    expect(within(panel).getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/admin/productos",
    );
  });

  it("lists what is running out, telling when there is none left", () => {
    vi.mocked(useLowStockProducts).mockReturnValue(
      query({
        data: {
          total: 2,
          items: [product({ id: "p2", title: "Lápiz negro", stock: 0 }), product({ stock: 4 })],
        },
      }),
    );
    signIn("ADMIN");
    render(<HomePage />);

    const panel = screen.getByRole("region", { name: "Stock bajo" });
    expect(within(panel).getByText("Sin stock")).toBeInTheDocument();
    expect(within(panel).getByText("4 u.")).toBeInTheDocument();
  });

  it("says there is enough stock when nothing is running out", () => {
    vi.mocked(useLowStockProducts).mockReturnValue(query({ data: { total: 0, items: [] } }));
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByText("Todo con stock suficiente.")).toBeInTheDocument();
  });

  it("says there are no products yet when the list comes empty", () => {
    vi.mocked(useLatestProducts).mockReturnValue(query({ data: [] }));
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByText("Todavía no hay productos.")).toBeInTheDocument();
  });

  it("holds the place of a list while it loads", () => {
    vi.mocked(useLatestProducts).mockReturnValue(query({ isPending: true }));
    signIn("ADMIN");
    render(<HomePage />);

    const panel = screen.getByRole("region", { name: "Últimos productos modificados" });
    expect(panel.querySelector("[aria-busy=true]")).not.toBeNull();
  });

  it("lets one block fail on its own and try again, while the rest keeps working", async () => {
    const refetch = vi.fn();
    vi.mocked(useLatestProducts).mockReturnValue(query({ isError: true, refetch }));
    const person = userEvent.setup();
    signIn("ADMIN");
    render(<HomePage />);

    const recent = screen.getByRole("region", { name: "Últimos productos modificados" });
    expect(within(recent).getByRole("alert")).toHaveTextContent("No pudimos cargar esta sección.");
    await person.click(within(recent).getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();

    expect(screen.getByRole("link", { name: /Productos activos/ })).toHaveTextContent("12");
    expect(
      within(screen.getByRole("region", { name: "Stock bajo" })).getByText("Sin stock"),
    ).toBeInTheDocument();
  });

  it("lets one number fail on its own and try again", async () => {
    const refetch = vi.fn();
    vi.mocked(useCategoriesTotal).mockReturnValue(query({ isError: true, refetch }));
    const person = userEvent.setup();
    signIn("ADMIN");
    render(<HomePage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Categorías activas: No se pudo cargar");
    await person.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Productos activos/ })).toHaveTextContent("12");
  });

  it("keeps the number and the rows it had when a later refresh fails", () => {
    vi.mocked(useCategoriesTotal).mockReturnValue(query({ data: 5, isError: true }));
    vi.mocked(useLatestProducts).mockReturnValue(query({ data: [product()], isError: true }));
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /Categorías activas/ })).toHaveTextContent("5");
    expect(screen.getByText("Cuaderno rayado")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar esta sección.")).not.toBeInTheDocument();
    expect(screen.queryByText(/No se pudo cargar/)).not.toBeInTheDocument();
  });

  it("tells how long ago from when the data was read, not from when the page opened", () => {
    const readAt = Date.now() + 3 * 60 * 60 * 1000;
    vi.mocked(useLatestProducts).mockReturnValue(
      query({ data: [product()], dataUpdatedAt: readAt }),
    );
    signIn("ADMIN");
    render(<HomePage />);

    expect(screen.getByText(/hace 3 horas/)).toBeInTheDocument();
  });

  it("asks for the same low stock list for the number and for the rows, so it is read once", () => {
    signIn("ADMIN");
    render(<HomePage />);

    const sizes = new Set(vi.mocked(useLowStockProducts).mock.calls.map(([size]) => size));
    expect(sizes).toEqual(new Set([5]));
  });

  it("offers the shortcut to add a user only to an admin", () => {
    signIn("ADMIN");
    const { unmount } = render(<HomePage />);
    const shortcuts = screen.getByRole("region", { name: "Atajos" });
    expect(within(shortcuts).getByRole("link", { name: "Dar de alta un usuario" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    unmount();

    act(() => useSessionStore.getState().expire());
    signIn("SELLER");
    render(<HomePage />);
    const sellerShortcuts = screen.getByRole("region", { name: "Atajos" });
    expect(
      within(sellerShortcuts).getByRole("link", { name: "Cargar un producto" }),
    ).toBeInTheDocument();
    expect(
      within(sellerShortcuts).getByRole("link", { name: "Crear una categoría" }),
    ).toBeInTheDocument();
    expect(
      within(sellerShortcuts).queryByRole("link", { name: "Dar de alta un usuario" }),
    ).not.toBeInTheDocument();
  });
});
