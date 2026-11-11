import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionUser, useUpdateSessionUser } from "@/modules/auth";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import type { AdminUserRow } from "../domain/admin-user";
import { adminUsersApi } from "../infrastructure/admin-users-client";
import { EditUserPage } from "./EditUserPage";
import { NewUserPage } from "./NewUserPage";

const push = vi.fn();
const updateSessionUser = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth")>()),
  useSessionUser: vi.fn(),
  useUpdateSessionUser: vi.fn(),
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const user = (overrides: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id: "u2",
  email: "ana@libreriamisueno.com.ar",
  name: "Ana Pérez",
  role: "SELLER",
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: new Date(Date.now() - 5 * 60 * 1000),
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
  updatedAt: new Date("2026-11-02T12:00:00.000Z"),
  deletedAt: null,
  ...overrides,
});

const givenUser = (overrides: Partial<AdminUserRow> = {}) =>
  vi.mocked(adminUsersApi.get).mockResolvedValue(user(overrides));

const renderEdit = (id = "u2") =>
  render(
    <QueryProvider>
      <EditUserPage id={id} />
    </QueryProvider>,
  );

const renderNew = () =>
  render(
    <QueryProvider>
      <NewUserPage />
    </QueryProvider>,
  );

const refusal = (code: string, message: string, status = 422) =>
  new ApiError({ status, code, message });

beforeEach(() => {
  push.mockReset();
  updateSessionUser.mockReset();
  for (const call of Object.values(adminUsersApi)) {
    const mocked = vi.mocked(call as () => Promise<unknown>);
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
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
  vi.mocked(useUpdateSessionUser).mockReturnValue(updateSessionUser);
});

describe("EditUserPage loading", () => {
  it("holds the place of the form while the user loads", () => {
    vi.mocked(adminUsersApi.get).mockReturnValue(new Promise(() => {}));
    renderEdit();

    expect(screen.getByLabelText("Cargando el usuario")).toHaveAttribute("aria-busy", "true");
  });

  it("says the user does not exist when the API says so", async () => {
    vi.mocked(adminUsersApi.get).mockRejectedValue(refusal("USER_NOT_FOUND", "No existe.", 404));
    renderEdit();

    expect(await screen.findByText("No encontramos ese usuario")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a usuarios" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
  });

  it("offers to try again when it could not load", async () => {
    vi.mocked(adminUsersApi.get).mockRejectedValueOnce(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión." }),
    );
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar el usuario");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Pérez" })).toBeInTheDocument();
  });
});

describe("EditUserPage another user", () => {
  it("shows the user in the form, with what is read-only as plain text and no password fields", async () => {
    givenUser({ isActive: false });
    renderEdit();

    expect(await screen.findByLabelText("Nombre")).toHaveValue("Ana Pérez");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@libreriamisueno.com.ar");
    expect(screen.getByRole("combobox", { name: "Rol" })).toHaveValue("SELLER");
    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeChecked();
    expect(screen.queryByLabelText("Contraseña temporal")).not.toBeInTheDocument();
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(header).toHaveTextContent("Vendedor");
    expect(header).toHaveTextContent("Alta el");
    expect(header).toHaveTextContent("Último acceso hace 5 minutos");
    expect(header).toHaveTextContent("Inactivo");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("offers every action and every field", async () => {
    givenUser();
    renderEdit();

    await screen.findByLabelText("Nombre");
    expect(screen.getByRole("combobox", { name: "Rol" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enviar contraseña temporal" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeEnabled();
  });

  it("has nothing to save until something changes", async () => {
    givenUser();
    renderEdit();

    await screen.findByLabelText("Nombre");
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(await screen.findByRole("combobox", { name: "Rol" }), "ADMIN");
    expect(screen.getByText("Hay cambios sin guardar")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(adminUsersApi.update).toHaveBeenCalledWith("u2", { role: "ADMIN" }));
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
    expect(adminUsersApi.get).toHaveBeenCalledTimes(1);
    expect(updateSessionUser).not.toHaveBeenCalled();
  });

  it("sends the state and the email together when both change", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    const email = await screen.findByLabelText("Email");
    await person.clear(email);
    await person.type(email, "ana.perez@libreriamisueno.com.ar");
    await person.click(screen.getByRole("radio", { name: "Inactivo" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminUsersApi.update).toHaveBeenCalledWith("u2", {
        email: "ana.perez@libreriamisueno.com.ar",
        isActive: false,
      }),
    );
  });

  it("marks a field that is not valid, focuses it and does not send", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    const name = await screen.findByLabelText("Nombre");
    await person.clear(name);
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Escribí el nombre.")).toBeInTheDocument();
    expect(name).toBeInvalid();
    expect(name).toHaveFocus();
    expect(adminUsersApi.update).not.toHaveBeenCalled();
  });

  it("shows the server's refusal next to the field and keeps what was typed", async () => {
    givenUser();
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("EMAIL_ALREADY_IN_USE", "Ese email ya lo usa otro usuario.", 409),
    );
    const person = userEvent.setup();
    renderEdit();

    const email = await screen.findByLabelText("Email");
    await person.clear(email);
    await person.type(email, "otro@libreriamisueno.com.ar");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Ese email ya lo usa otro usuario.")).toBeInTheDocument();
    expect(email).toHaveValue("otro@libreriamisueno.com.ar");
    expect(email).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the last-admin refusal at the role", async () => {
    givenUser({ role: "ADMIN" });
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo."),
    );
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(await screen.findByRole("combobox", { name: "Rol" }), "SELLER");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Tiene que quedar al menos un administrador activo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rol" })).toBeInvalid();
    expect(screen.getByRole("combobox", { name: "Rol" })).toHaveValue("SELLER");
  });

  it("shows the last-admin refusal at the state when only the state changed", async () => {
    givenUser({ role: "ADMIN" });
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo."),
    );
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("radio", { name: "Inactivo" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Tiene que quedar al menos un administrador activo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeChecked();
  });

  it("shows a failure that belongs to no field in an alert above the form", async () => {
    givenUser();
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("INTERNAL_ERROR", "Algo salió mal.", 500),
    );
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(await screen.findByRole("combobox", { name: "Rol" }), "ADMIN");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Algo salió mal.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("alert").some((alert) => alert.textContent === "Algo salió mal."),
    ).toBe(true);
  });

  it("asks before leaving with changes", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    await person.type(screen.getByLabelText("Nombre"), " X");
    await person.click(screen.getByRole("button", { name: "Cancelar" }));

    const dialog = await screen.findByRole("alertdialog", { name: "¿Salir sin guardar?" });
    await person.click(within(dialog).getByRole("button", { name: "Salir" }));
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
  });
});

describe("EditUserPage own account", () => {
  const own = () =>
    givenUser({
      id: "u1",
      name: "Marta Gómez",
      email: "marta@libreriamisueno.com.ar",
      role: "ADMIN",
    });

  it("explains it and disables role, state, temporary password and baja, each with its reason", async () => {
    own();
    renderEdit("u1");

    await screen.findByLabelText("Nombre");
    expect(screen.getByRole("note")).toHaveTextContent("Es tu propia cuenta");
    expect(screen.getByRole("link", { name: "Ir a Mi cuenta" })).toHaveAttribute(
      "href",
      "/admin/mi-cuenta",
    );
    const role = screen.getByRole("combobox", { name: "Rol" });
    expect(role).toBeDisabled();
    expect(role).toHaveAccessibleDescription("No podés cambiar tu propio rol.");
    expect(screen.getByRole("radio", { name: "Activo" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeDisabled();
    expect(screen.getByRole("radiogroup", { name: "Estado" })).toHaveAccessibleDescription(
      "No podés desactivarte a vos mismo.",
    );
    const reset = screen.getByRole("button", { name: "Enviar contraseña temporal" });
    expect(reset).toBeDisabled();
    expect(reset).toHaveAttribute("title", "Para cambiar tu contraseña usá Mi cuenta.");
    const remove = screen.getByRole("button", { name: "Dar de baja" });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute("title", "No podés darte de baja a vos mismo.");
  });

  it("keeps name and email editable, sends them and updates the session's user", async () => {
    own();
    const person = userEvent.setup();
    renderEdit("u1");

    const name = await screen.findByLabelText("Nombre");
    await person.clear(name);
    await person.type(name, "Marta G.");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminUsersApi.update).toHaveBeenCalledWith("u1", { name: "Marta G." }),
    );
    expect(updateSessionUser).toHaveBeenCalledWith({ name: "Marta G." });
    expect(Object.keys(updateSessionUser.mock.calls[0][0])).toEqual(["name"]);
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("does not update the session when another user's name is edited", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    await person.type(await screen.findByLabelText("Nombre"), " X");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(adminUsersApi.update).toHaveBeenCalled());
    expect(updateSessionUser).not.toHaveBeenCalled();
  });
});

describe("EditUserPage actions and deleted users", () => {
  it("sends a temporary password from the header, after asking", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Enviar contraseña temporal" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Enviar contraseña",
      }),
    );

    await waitFor(() => expect(adminUsersApi.resetPassword).toHaveBeenCalledWith("u2"));
  });

  it("gives the user a logical delete from the header, after asking", async () => {
    givenUser();
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Dar de baja" }),
    );

    await waitFor(() => expect(adminUsersApi.remove).toHaveBeenCalledWith("u2"));
  });

  it("shows a deleted user read-only, with the way to bring it back", async () => {
    givenUser({ deletedAt: new Date("2026-11-05T12:00:00.000Z") });
    const person = userEvent.setup();
    renderEdit();

    const notice = (await screen.findByText(/dado de baja desde/)).closest(
      "[role=status]",
    ) as HTMLElement;
    expect(notice).toHaveTextContent("5 de noviembre de 2026");
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar contraseña temporal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre").closest("[inert]")).not.toBeNull();

    await person.click(within(notice).getByRole("button", { name: "Reactivar" }));
    await waitFor(() => expect(adminUsersApi.restore).toHaveBeenCalledWith("u2"));
  });
});

describe("NewUserPage", () => {
  const fillIn = async (
    person: ReturnType<typeof userEvent.setup>,
    password = "clave-temporal-1",
  ) => {
    await person.type(screen.getByLabelText("Nombre"), "Beto Ruiz");
    await person.type(screen.getByLabelText("Email"), "beto@libreriamisueno.com.ar");
    await person.selectOptions(screen.getByRole("combobox", { name: "Rol" }), "SELLER");
    await person.type(screen.getByLabelText("Contraseña temporal"), password);
    await person.type(screen.getByLabelText("Repetir contraseña"), password);
  };

  it("shows an empty form with the password fields and no state", () => {
    renderNew();

    expect(screen.getByRole("heading", { level: 1, name: "Nuevo usuario" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Rol" })).toHaveValue("");
    expect(screen.getByLabelText("Contraseña temporal")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Repetir contraseña")).toHaveAttribute("type", "password");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeEnabled();
  });

  it("marks what is missing and sends nothing, with the first problem focused", async () => {
    const person = userEvent.setup();
    renderNew();

    await person.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText("Escribí el nombre.")).toBeInTheDocument();
    expect(screen.getByText("Escribí el email.")).toBeInTheDocument();
    expect(screen.getByText("Elegí un rol.")).toBeInTheDocument();
    expect(screen.getByText("Escribí la contraseña temporal.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
    expect(adminUsersApi.create).not.toHaveBeenCalled();
  });

  it("does not send when the confirmation does not match", async () => {
    const person = userEvent.setup();
    renderNew();

    await fillIn(person);
    const confirmation = screen.getByLabelText("Repetir contraseña");
    await person.clear(confirmation);
    await person.type(confirmation, "otra-clave-1");
    await person.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(confirmation).toHaveFocus();
    expect(adminUsersApi.create).not.toHaveBeenCalled();
  });

  it("does not send a password that is too short", async () => {
    const person = userEvent.setup();
    renderNew();

    await fillIn(person, "corta");
    await person.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(
      await screen.findByText("La contraseña tiene que tener entre 8 y 128 caracteres."),
    ).toBeInTheDocument();
    expect(adminUsersApi.create).not.toHaveBeenCalled();
  });

  it("sends the user without the confirmation, tells it and goes back to the list", async () => {
    const person = userEvent.setup();
    renderNew();

    await fillIn(person);
    await person.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() =>
      expect(adminUsersApi.create).toHaveBeenCalledWith({
        name: "Beto Ruiz",
        email: "beto@libreriamisueno.com.ar",
        role: "SELLER",
        temporaryPassword: "clave-temporal-1",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Usuario creado");
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("shows the server's refusal at the email and keeps the form", async () => {
    vi.mocked(adminUsersApi.create).mockRejectedValue(
      refusal("EMAIL_ALREADY_IN_USE", "Ese email ya lo usa otro usuario.", 409),
    );
    const person = userEvent.setup();
    renderNew();

    await fillIn(person);
    await person.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText("Ese email ya lo usa otro usuario.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Beto Ruiz");
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(push).not.toHaveBeenCalled();
  });

  it("asks before leaving once something was typed", async () => {
    const person = userEvent.setup();
    renderNew();

    expect(screen.getByRole("link", { name: "Cancelar" })).toBeInTheDocument();
    await person.type(screen.getByLabelText("Nombre"), "Be");

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
