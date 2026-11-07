import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { sessionAuthApi } from "../application/session-client";
import { useSessionStore } from "../application/session-store";
import type { LoginResult } from "../infrastructure/auth-api";
import { ChangePasswordPage } from "./ChangePasswordPage";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../application/session-client", () => ({
  sessionAuthApi: { changePassword: vi.fn() },
}));

const user = {
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta",
  role: "ADMIN" as const,
  mustChangePassword: false,
};

const renewed: LoginResult = {
  accessToken: "token-renewed",
  expiresIn: 900,
  user,
};

const signIn = (mustChangePassword: boolean) =>
  useSessionStore.setState({
    status: "authenticated",
    accessToken: "token-old",
    user: { ...user, mustChangePassword },
  });

const renderPage = () =>
  render(
    <QueryProvider>
      <ChangePasswordPage />
    </QueryProvider>,
  );

const fill = async (
  person: ReturnType<typeof userEvent.setup>,
  values: { current?: string; next?: string; confirm?: string },
) => {
  if (values.current) await person.type(screen.getByLabelText("Contraseña actual"), values.current);
  if (values.next) await person.type(screen.getByLabelText("Contraseña nueva"), values.next);
  if (values.confirm) {
    await person.type(screen.getByLabelText("Repetí la contraseña nueva"), values.confirm);
  }
  await person.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
};

beforeEach(() => {
  replace.mockReset();
  vi.mocked(sessionAuthApi.changePassword).mockReset();
  signIn(false);
});

describe("ChangePasswordPage", () => {
  it("shows the three password fields and tells why when the change is required", () => {
    signIn(true);
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Cambiar contraseña" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ingresaste con una clave temporal/)).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("Contraseña nueva")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Repetí la contraseña nueva")).toHaveAttribute("type", "password");
  });

  it("does not mention a temporary password when the person chose to change it", () => {
    renderPage();

    expect(screen.queryByText(/clave temporal/)).not.toBeInTheDocument();
  });

  it("lets each password be seen and hidden", async () => {
    const person = userEvent.setup();
    renderPage();

    const buttons = screen.getAllByRole("button", { name: "Mostrar contraseña" });
    expect(buttons).toHaveLength(3);
    await person.click(buttons[1]);

    expect(screen.getByLabelText("Contraseña nueva")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("type", "password");
  });

  it.each([
    [
      "no current password",
      { next: "clave-nueva-1", confirm: "clave-nueva-1" },
      "Escribí tu contraseña actual.",
    ],
    [
      "a short new password",
      { current: "vieja-1234", next: "corta", confirm: "corta" },
      "La contraseña nueva debe tener al menos 8 caracteres.",
    ],
    [
      "a long new password",
      { current: "vieja-1234", next: "a".repeat(129), confirm: "a".repeat(129) },
      "La contraseña nueva no puede tener más de 128 caracteres.",
    ],
    [
      "a different repetition",
      { current: "vieja-1234", next: "clave-nueva-1", confirm: "clave-nueva-2" },
      "Las contraseñas no coinciden.",
    ],
    [
      "the same password",
      { current: "misma-clave-1", next: "misma-clave-1", confirm: "misma-clave-1" },
      "La contraseña nueva tiene que ser distinta de la actual.",
    ],
  ])("rejects %s without calling the API", async (_case, values, message) => {
    const person = userEvent.setup();
    renderPage();

    await fill(person, values);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(sessionAuthApi.changePassword).not.toHaveBeenCalled();
  });

  it("sends both passwords, keeps the renewed session and goes to the panel when it was required", async () => {
    signIn(true);
    vi.mocked(sessionAuthApi.changePassword).mockResolvedValue(renewed);
    const person = userEvent.setup();
    renderPage();

    await fill(person, {
      current: "clave-temporal",
      next: "clave-nueva-1",
      confirm: "clave-nueva-1",
    });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/productos"));
    expect(sessionAuthApi.changePassword).toHaveBeenCalledWith({
      currentPassword: "clave-temporal",
      newPassword: "clave-nueva-1",
    });
    expect(useSessionStore.getState()).toMatchObject({
      accessToken: "token-renewed",
      user: { mustChangePassword: false },
    });
    expect(screen.queryByRole("status")).toBeEmptyDOMElement();
  });

  it("stays, tells it worked and clears the fields when the person chose to change it", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockResolvedValue(renewed);
    const person = userEvent.setup();
    renderPage();

    await fill(person, {
      current: "vieja-clave-1",
      next: "clave-nueva-1",
      confirm: "clave-nueva-1",
    });

    expect(await screen.findByText("Listo, cambiaste tu contraseña.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
    expect(screen.getByLabelText("Contraseña nueva")).toHaveValue("");
    expect(screen.getByLabelText("Repetí la contraseña nueva")).toHaveValue("");
    expect(useSessionStore.getState().accessToken).toBe("token-renewed");
  });

  it("shows the API's message for a wrong current password and keeps what was typed", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockRejectedValue(
      new ApiError({
        status: 400,
        code: "INVALID_CURRENT_PASSWORD",
        message: "La contraseña actual no es correcta.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await fill(person, {
      current: "equivocada-1",
      next: "clave-nueva-1",
      confirm: "clave-nueva-1",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña actual no es correcta.",
    );
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("equivocada-1");
    expect(replace).not.toHaveBeenCalled();
    expect(useSessionStore.getState().accessToken).toBe("token-old");
  });

  it("tells how long to wait after too many attempts", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockRejectedValue(
      new ApiError({ status: 429, code: "TOO_MANY_REQUESTS", message: "x", retryAfter: 60 }),
    );
    const person = userEvent.setup();
    renderPage();

    await fill(person, {
      current: "vieja-clave-1",
      next: "clave-nueva-1",
      confirm: "clave-nueva-1",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Esperá 1 minuto");
  });

  it("shows the connection message the client prepared", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No pudimos conectarnos." }),
    );
    const person = userEvent.setup();
    renderPage();

    await fill(person, {
      current: "vieja-clave-1",
      next: "clave-nueva-1",
      confirm: "clave-nueva-1",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectarnos.");
  });

  it("can be filled and sent with the keyboard alone", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockResolvedValue(renewed);
    const person = userEvent.setup();
    renderPage();

    await person.tab();
    expect(screen.getByLabelText("Contraseña actual")).toHaveFocus();
    await person.keyboard("vieja-clave-1");
    await person.tab();
    await person.tab();
    await person.keyboard("clave-nueva-1");
    await person.tab();
    await person.tab();
    await person.keyboard("clave-nueva-1{Enter}");

    expect(await screen.findByText("Listo, cambiaste tu contraseña.")).toBeInTheDocument();
  });
});
