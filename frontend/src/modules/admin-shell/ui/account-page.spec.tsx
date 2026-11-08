import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sessionAuthApi } from "@/modules/auth/application/session-client";
import { useSessionStore } from "@/modules/auth/application/session-store";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { AccountPage } from "./AccountPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/modules/auth/application/session-client", () => ({
  sessionAuthApi: { me: vi.fn(), changePassword: vi.fn() },
}));

const user = {
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta Gómez",
  role: "SELLER" as const,
  mustChangePassword: false,
};

const signIn = (role: "ADMIN" | "SELLER" = "SELLER") =>
  act(() =>
    useSessionStore
      .getState()
      .start({ accessToken: "token", expiresIn: 900, user: { ...user, role } }),
  );

const renderPage = () =>
  render(
    <QueryProvider>
      <AccountPage />
    </QueryProvider>,
  );

beforeEach(() => {
  vi.mocked(sessionAuthApi.me).mockReset();
  vi.mocked(sessionAuthApi.changePassword).mockReset();
  vi.mocked(sessionAuthApi.me).mockResolvedValue({
    name: user.name,
    email: user.email,
    role: "SELLER",
  });
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("AccountPage", () => {
  it("shows who the person is and what they may ask an administrator", () => {
    signIn();
    renderPage();

    const card = screen.getByRole("region", { name: "Mi cuenta" });
    expect(within(card).getByRole("heading", { name: "Marta Gómez" })).toBeInTheDocument();
    expect(within(card).getByText("marta@libreriamisueno.com.ar")).toBeInTheDocument();
    expect(within(card).getByText("Vendedor")).toBeInTheDocument();
    expect(within(card).getByText(/pedíselo a un administrador/)).toBeInTheDocument();
  });

  it("tells an admin to ask another admin", () => {
    signIn("ADMIN");
    renderPage();

    expect(screen.getByText(/pedíselo a otro administrador/)).toBeInTheDocument();
  });

  it("shows the last sign in and the creation date when the API has them", async () => {
    vi.mocked(sessionAuthApi.me).mockResolvedValue({
      name: user.name,
      email: user.email,
      role: "SELLER",
      lastLoginAt: new Date(2026, 10, 7, 10, 15),
      createdAt: new Date(2026, 0, 2, 9, 0),
    });
    signIn();
    renderPage();

    expect(await screen.findByText("Último ingreso")).toBeInTheDocument();
    expect(screen.getByText(/7 de noviembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText("Cuenta creada")).toBeInTheDocument();
    expect(screen.getByText("2 de enero de 2026")).toBeInTheDocument();
  });

  it("leaves those lines out when the API does not send the dates", async () => {
    signIn();
    renderPage();

    await vi.waitFor(() => expect(sessionAuthApi.me).toHaveBeenCalled());
    expect(screen.queryByText("Último ingreso")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuenta creada")).not.toBeInTheDocument();
  });

  it("still shows the person when their data could not be asked for", async () => {
    vi.mocked(sessionAuthApi.me).mockRejectedValue(new Error("boom"));
    signIn();
    renderPage();

    await vi.waitFor(() => expect(sessionAuthApi.me).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Marta Gómez" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("changes the password, keeps the session and clears the fields", async () => {
    vi.mocked(sessionAuthApi.changePassword).mockResolvedValue({
      accessToken: "token-renewed",
      expiresIn: 900,
      user,
    });
    const person = userEvent.setup();
    signIn();
    renderPage();

    await person.type(screen.getByLabelText("Contraseña actual"), "vieja-clave-1");
    await person.type(screen.getByLabelText("Contraseña nueva"), "clave-nueva-1");
    await person.type(screen.getByLabelText("Repetí la contraseña nueva"), "clave-nueva-1");
    await person.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Listo, cambiaste tu contraseña.")).toBeInTheDocument();
    expect(sessionAuthApi.changePassword).toHaveBeenCalledWith({
      currentPassword: "vieja-clave-1",
      newPassword: "clave-nueva-1",
    });
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
    expect(useSessionStore.getState().accessToken).toBe("token-renewed");
    expect(screen.getByText(/se cierran tus sesiones en otros dispositivos/)).toBeInTheDocument();
  });
});
