import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { useSessionStore } from "../application/session-store";
import { authApi, type LoginResult } from "../infrastructure/auth-api";
import { expectNoStoredSession } from "../testing/expect-no-stored-session";
import { LoginPage } from "./LoginPage";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../infrastructure/auth-api", () => ({ authApi: { login: vi.fn() } }));

const result = (user: Partial<LoginResult["user"]> = {}): LoginResult => ({
  accessToken: "token-123",
  expiresIn: 900,
  user: {
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta",
    role: "ADMIN",
    mustChangePassword: false,
    ...user,
  },
});

const renderPage = (next?: string) =>
  render(
    <QueryProvider>
      <LoginPage next={next} />
    </QueryProvider>,
  );

beforeEach(() => {
  replace.mockReset();
  vi.mocked(authApi.login).mockReset();
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("LoginPage", () => {
  it("shows the heading, both fields, the link to recover the password and the button", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Hola de nuevo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
      "href",
      "/admin/olvide-mi-contrasena",
    );
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  it("lets the password be seen and hidden", async () => {
    const user = userEvent.setup();
    renderPage();
    const field = screen.getByLabelText("Contraseña");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(field).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("says what is missing next to each field, sends nothing and focuses the first one", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Escribí tu email.")).toBeInTheDocument();
    expect(screen.getByText("Escribí tu contraseña.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Escribí tu email.");
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("asks for a valid email and sends nothing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(
      screen.getByText("Escribí un email válido, como nombre@dominio.com."),
    ).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("signs in with the keyboard, trimming the email, and goes to the products", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result());
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "  marta@libreriamisueno.com.ar ");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(authApi.login).toHaveBeenCalledWith({
      email: "marta@libreriamisueno.com.ar",
      password: "secreto123",
    });
    expect(replace).toHaveBeenCalledWith("/admin/productos");
    expect(useSessionStore.getState()).toMatchObject({
      status: "authenticated",
      accessToken: "token-123",
    });
    expectNoStoredSession();
  });

  it("keeps the button busy once signed in, so a second click does nothing", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result());
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
  });

  it("sends a temporary password to the change screen, even with an address to go back to", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result({ mustChangePassword: true }));
    const user = userEvent.setup();
    renderPage("/admin/usuarios");

    await user.type(screen.getByLabelText("Email"), "diego@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "temporal123{Enter}");

    expect(replace).toHaveBeenCalledWith("/admin/cambiar-contrasena");
  });

  it("goes back to where the person was heading, when their role may open it", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result());
    const user = userEvent.setup();
    renderPage("/admin/usuarios");

    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(replace).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("keeps a seller out of the users section and sends them to the products", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result({ role: "SELLER" }));
    const user = userEvent.setup();
    renderPage("/admin/usuarios");

    await user.type(screen.getByLabelText("Email"), "lucia@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(replace).toHaveBeenCalledWith("/admin/productos");
  });

  it("ignores an address that leads out of the panel", async () => {
    vi.mocked(authApi.login).mockResolvedValue(result());
    const user = userEvent.setup();
    renderPage("https://evil.com");

    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(replace).toHaveBeenCalledWith("/admin/productos");
  });

  it("announces wrong credentials, keeps what was typed and lets try again", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "El email o la contraseña no son correctos.",
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "mala{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El email o la contraseña no son correctos.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("marta@libreriamisueno.com.ar");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("loading");
  });

  it("tells how long to wait after too many attempts", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({
        status: 429,
        code: "TOO_MANY_REQUESTS",
        message: "Hiciste demasiados intentos.",
        retryAfter: 300,
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Hiciste demasiados intentos. Esperá 5 minutos y volvé a intentar.",
    );
  });

  it("explains a lost connection with the client's own message", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "No pudimos conectarnos. Revisá tu conexión a internet.",
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreriamisueno.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectarnos");
  });
});
