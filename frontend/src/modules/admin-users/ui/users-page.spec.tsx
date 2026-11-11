import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionUser } from "@/modules/auth";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import type { AdminUserRow } from "../domain/admin-user";
import { adminUsersApi } from "../infrastructure/admin-users-client";
import { UsersPage } from "./UsersPage";

const push = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth")>()),
  useSessionUser: vi.fn(),
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: { list: vi.fn(), remove: vi.fn(), restore: vi.fn(), resetPassword: vi.fn() },
}));

const FIVE_MINUTES = 5 * 60 * 1000;

const user = (overrides: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id: "u2",
  email: "ana@libreriamisueno.com.ar",
  name: "Ana Pérez",
  role: "SELLER",
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: new Date(Date.now() - FIVE_MINUTES),
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
  updatedAt: new Date("2026-11-02T12:00:00.000Z"),
  deletedAt: null,
  ...overrides,
});

const MARTA = user({
  id: "u1",
  name: "Marta Gómez",
  email: "marta@libreriamisueno.com.ar",
  role: "ADMIN",
});

const givenUsers = (items: AdminUserRow[], total = items.length) =>
  vi.mocked(adminUsersApi.list).mockResolvedValue({ items, total });

const renderPage = () =>
  render(
    <QueryProvider>
      <UsersPage />
    </QueryProvider>,
  );

const rowOf = (name: string) => screen.getByRole("link", { name }).closest("tr") as HTMLElement;

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  search = "";
  for (const call of Object.values(adminUsersApi)) {
    vi.mocked(call as () => Promise<unknown>).mockReset();
  }
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(useSessionUser).mockReturnValue({
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta Gómez",
    role: "ADMIN",
    mustChangePassword: false,
  });
});

describe("UsersPage", () => {
  it("has a heading and a link to add a user", async () => {
    givenUsers([user()]);
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agregar usuario" })).toHaveAttribute(
      "href",
      "/admin/usuarios/nuevo",
    );
    await screen.findByText("Ana Pérez");
  });

  it("holds the place of the table while it loads", () => {
    vi.mocked(adminUsersApi.list).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByLabelText("Cargando usuarios")).toHaveAttribute("aria-busy", "true");
  });

  it("asks for what the address says", async () => {
    search = "q=ana&rol=vendedor&estado=bajas&pagina=2";
    givenUsers([user()], 45);
    renderPage();

    await screen.findByText("Ana Pérez");
    expect(adminUsersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "ana",
        role: "SELLER",
        status: "DELETED",
        page: 2,
        limit: 20,
      }),
      expect.any(AbortSignal),
    );
  });

  it("shows each user with what the table is for", async () => {
    givenUsers([MARTA, user({ mustChangePassword: true, isActive: false, lastLoginAt: null })]);
    renderPage();

    await screen.findByRole("link", { name: "Ana Pérez" });
    const ana = rowOf("Ana Pérez");
    expect(ana).toHaveTextContent("ana@libreriamisueno.com.ar");
    expect(ana).toHaveTextContent("Vendedor");
    expect(ana).toHaveTextContent("Inactivo");
    expect(ana).toHaveTextContent("Debe cambiar la contraseña");
    expect(ana).toHaveTextContent("Nunca");
    const marta = rowOf("Marta Gómez");
    expect(marta).toHaveTextContent("Administrador");
    expect(marta).toHaveTextContent("Activo");
    expect(marta).toHaveTextContent("hace 5 minutos");
    expect(marta).not.toHaveTextContent("Debe cambiar la contraseña");
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute(
      "href",
      "/admin/usuarios/u2",
    );
  });

  it("gives the full date of the last access as a tooltip of the relative one", async () => {
    givenUsers([user()]);
    renderPage();

    const time = await screen.findByText("hace 5 minutos");
    expect(time).toHaveAttribute("title", expect.stringMatching(/\d{1,2} de \w+ de \d{4}/));
    expect(time.tagName).toBe("TIME");
  });

  it("marks the signed-in user's row", async () => {
    givenUsers([MARTA, user()]);
    renderPage();

    await screen.findByText("Ana Pérez");
    expect(rowOf("Marta Gómez")).toHaveTextContent("Vos");
    expect(rowOf("Ana Pérez")).not.toHaveTextContent("Vos");
  });
});

describe("UsersPage own account", () => {
  it("keeps edit but disables the temporary password and the baja on the own row, with the reason", async () => {
    givenUsers([MARTA]);
    renderPage();

    expect(await screen.findByRole("link", { name: "Editar Marta Gómez" })).toBeInTheDocument();
    const reset = screen.getByRole("button", {
      name: "Enviar contraseña temporal a Marta Gómez",
    });
    const remove = screen.getByRole("button", { name: "Dar de baja a Marta Gómez" });
    expect(reset).toBeDisabled();
    expect(reset).toHaveAttribute("title", "Para cambiar tu contraseña usá Mi cuenta.");
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute("title", "No podés darte de baja a vos mismo.");
  });

  it("leaves another user's actions enabled", async () => {
    givenUsers([MARTA, user()]);
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dar de baja a Ana Pérez" })).toBeEnabled();
  });
});

describe("UsersPage filters", () => {
  it("changes the role and the state from the selects", async () => {
    givenUsers([user()]);
    const person = userEvent.setup();
    renderPage();

    await person.selectOptions(await screen.findByRole("combobox", { name: "Rol" }), "admin");
    expect(push).toHaveBeenLastCalledWith("/admin/usuarios?rol=admin");
    await person.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "bajas");
    expect(push).toHaveBeenLastCalledWith("/admin/usuarios?estado=bajas");
  });

  it("offers every role and clears the role from the first option", async () => {
    search = "rol=admin";
    givenUsers([user()]);
    const person = userEvent.setup();
    renderPage();

    const select = await screen.findByRole("combobox", { name: "Rol" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todos los roles", "Administradores", "Vendedores"]);
    await person.selectOptions(select, "");

    expect(push).toHaveBeenLastCalledWith("/admin/usuarios");
  });

  it("offers to clear the filters only when something is filtering", async () => {
    givenUsers([user()]);
    const { unmount } = renderPage();
    await screen.findByText("Ana Pérez");
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    unmount();

    search = "q=ana&estado=bajas";
    const person = userEvent.setup();
    renderPage();
    await person.click(await screen.findByRole("button", { name: "Limpiar filtros" }));

    expect(push).toHaveBeenLastCalledWith("/admin/usuarios");
  });
});

describe("UsersPage delete", () => {
  it("asks first and does nothing if it is cancelled", async () => {
    givenUsers([user()]);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja a Ana Pérez" }));
    const dialog = await screen.findByRole("alertdialog", { name: '¿Dar de baja a "Ana Pérez"?' });
    await person.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(adminUsersApi.remove).not.toHaveBeenCalled();
  });

  it("deletes once confirmed, tells it and reads the list again", async () => {
    givenUsers([user()]);
    vi.mocked(adminUsersApi.remove).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja a Ana Pérez" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Usuario dado de baja"));
    expect(adminUsersApi.remove).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(adminUsersApi.list).toHaveBeenCalledTimes(2));
  });

  it("gives the reason when the API refuses, as when it is the last active admin", async () => {
    givenUsers([user({ role: "ADMIN" })]);
    vi.mocked(adminUsersApi.remove).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "LAST_ACTIVE_ADMIN",
        message: "Tiene que quedar al menos un administrador activo.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja a Ana Pérez" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Tiene que quedar al menos un administrador activo.",
      ),
    );
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("disables the actions of a user while its request is on its way, and only that user's", async () => {
    givenUsers([
      user(),
      user({ id: "u3", name: "Beto Ruiz", email: "beto@libreriamisueno.com.ar" }),
    ]);
    vi.mocked(adminUsersApi.remove).mockReturnValue(new Promise(() => {}));
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja a Ana Pérez" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dar de baja a Ana Pérez" })).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dar de baja a Beto Ruiz" })).toBeEnabled();
    expect(adminUsersApi.remove).toHaveBeenCalledTimes(1);
  });
});

describe("UsersPage temporary password", () => {
  it("asks first and does nothing if it is cancelled", async () => {
    givenUsers([user()]);
    const person = userEvent.setup();
    renderPage();

    await person.click(
      await screen.findByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: '¿Enviar una contraseña temporal a "Ana Pérez"?',
    });
    await person.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(adminUsersApi.resetPassword).not.toHaveBeenCalled();
  });

  it("sends it once confirmed and tells it", async () => {
    givenUsers([user()]);
    vi.mocked(adminUsersApi.resetPassword).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(
      await screen.findByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    );
    await person.click(await screen.findByRole("button", { name: "Enviar contraseña" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Le enviamos una contraseña temporal por mail"),
    );
    expect(adminUsersApi.resetPassword).toHaveBeenCalledWith("u2");
  });

  it("tells when the mail could not be sent", async () => {
    givenUsers([user()]);
    vi.mocked(adminUsersApi.resetPassword).mockRejectedValue(
      new ApiError({
        status: 502,
        code: "MAIL_DELIVERY_FAILED",
        message: "No pudimos enviar el mail. Probá de nuevo.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(
      await screen.findByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    );
    await person.click(await screen.findByRole("button", { name: "Enviar contraseña" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No pudimos enviar el mail. Probá de nuevo."),
    );
  });
});

describe("UsersPage deleted users and restore", () => {
  const deleted = () => user({ deletedAt: new Date("2026-11-05T12:00:00.000Z") });

  it("lists a deleted user without a way to edit it, with the way to bring it back", async () => {
    search = "estado=bajas";
    givenUsers([deleted()]);
    renderPage();

    expect(await screen.findByText("Dado de baja")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ana Pérez" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar Ana Pérez" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dar de baja a Ana Pérez" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar contraseña temporal a Ana Pérez" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivar a Ana Pérez" })).toBeInTheDocument();
  });

  it("restores at once, without asking", async () => {
    search = "estado=bajas";
    givenUsers([deleted()]);
    vi.mocked(adminUsersApi.restore).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar a Ana Pérez" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Usuario reactivado"));
    expect(adminUsersApi.restore).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(adminUsersApi.list).toHaveBeenCalledTimes(2));
  });

  it("tells why the API refuses to restore and leaves the user where it was", async () => {
    search = "estado=bajas";
    givenUsers([deleted()]);
    vi.mocked(adminUsersApi.restore).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "EMAIL_ALREADY_IN_USE",
        message: "Ese email ya lo usa otro usuario.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar a Ana Pérez" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Ese email ya lo usa otro usuario."),
    );
    expect(screen.getByRole("button", { name: "Reactivar a Ana Pérez" })).toBeInTheDocument();
  });
});

describe("UsersPage states and pagination", () => {
  it("offers to clear the filters when nothing matches", async () => {
    search = "q=zzz";
    givenUsers([]);
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No hay usuarios con estos filtros")).toBeInTheDocument();
    await person.click(
      within(screen.getByRole("status")).getByRole("button", { name: "Limpiar filtros" }),
    );

    expect(push).toHaveBeenLastCalledWith("/admin/usuarios");
  });

  it("invites to add the first user when there are none at all", async () => {
    givenUsers([]);
    renderPage();

    expect(await screen.findByText("Todavía no hay usuarios")).toBeInTheDocument();
  });

  it("says it could not load and tries again on request", async () => {
    vi.mocked(adminUsersApi.list).mockRejectedValue(new Error("boom"));
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar los usuarios");
    vi.mocked(adminUsersApi.list).mockResolvedValue({ items: [user()], total: 1 });
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
  });

  it("offers the first page when the one asked for is past the last", async () => {
    search = "q=ana&pagina=9";
    givenUsers([], 12);
    renderPage();

    expect(await screen.findByText("Esa página no existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la primera página" })).toHaveAttribute(
      "href",
      "/admin/usuarios?q=ana",
    );
  });

  it("tells which users it shows and links the pages keeping the filters", async () => {
    search = "rol=vendedor&pagina=2";
    givenUsers(
      Array.from({ length: 20 }, (_, index) => user({ id: `k${index}`, name: `Usuario ${index}` })),
      45,
    );
    renderPage();

    expect(await screen.findByText("21–40 de 45")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(within(nav).getByRole("link", { name: "Página 1" })).toHaveAttribute(
      "href",
      "/admin/usuarios?rol=vendedor",
    );
    expect(within(nav).getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/admin/usuarios?rol=vendedor&pagina=3",
    );
  });

  it("keeps the last rows as a reference but out of reach while the next page loads", async () => {
    givenUsers([user()]);
    const { rerender } = renderPage();
    await screen.findByText("Ana Pérez");

    vi.mocked(adminUsersApi.list).mockReturnValue(new Promise(() => {}));
    search = "estado=bajas";
    rerender(
      <QueryProvider>
        <UsersPage />
      </QueryProvider>,
    );

    const stale = await waitFor(() => {
      const element = screen.getByText("Ana Pérez").closest("[inert]");
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    expect(stale).toHaveAttribute("aria-busy", "true");
  });
});
