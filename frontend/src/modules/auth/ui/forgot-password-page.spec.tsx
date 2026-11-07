import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { authApi } from "../infrastructure/auth-api";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

vi.mock("../infrastructure/auth-api", () => ({ authApi: { forgotPassword: vi.fn() } }));

const renderPage = () =>
  render(
    <QueryProvider>
      <ForgotPasswordPage />
    </QueryProvider>,
  );

beforeEach(() => {
  vi.mocked(authApi.forgotPassword).mockReset();
});

describe("ForgotPasswordPage", () => {
  it("shows the heading, the email field and the button", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "¿Olvidaste tu contraseña?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Enviar clave temporal" })).toBeEnabled();
  });

  it("asks for a valid email without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));
    expect(await screen.findByText("Escribí tu email.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "marta@");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));
    expect(
      await screen.findByText("Escribí un email válido, como nombre@dominio.com."),
    ).toBeInTheDocument();
    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it("sends the email and replaces the form with the neutral message and a way back", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreria.com");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Si el email existe, te enviamos una clave temporal.",
    );
    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authApi.forgotPassword).toHaveBeenCalledWith("marta@libreria.com");
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a ingresar" })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });

  it("goes back to the form with the email still typed to fix a mistake", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@gmial.com");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));
    await user.click(await screen.findByRole("button", { name: "Usar otro email" }));

    expect(screen.getByLabelText("Email")).toHaveValue("marta@gmial.com");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("works with the keyboard alone", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.tab();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    await user.keyboard("marta@libreria.com{Enter}");

    expect(await screen.findByRole("status")).toHaveTextContent("te enviamos una clave temporal");
  });

  it("tells how long to wait after too many attempts and keeps the form", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(
      new ApiError({ status: 429, code: "TOO_MANY_REQUESTS", message: "x", retryAfter: 120 }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreria.com");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esperá 2 minutos");
    expect(screen.getByLabelText("Email")).toHaveValue("marta@libreria.com");
    expect(screen.getByRole("button", { name: "Enviar clave temporal" })).toBeEnabled();
  });

  it("shows the connection message the client prepared", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No pudimos conectarnos." }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreria.com");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectarnos.");
  });

  it("does not send the request twice while it is on its way", async () => {
    let finish: () => void = () => {};
    vi.mocked(authApi.forgotPassword).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "marta@libreria.com");
    await user.click(screen.getByRole("button", { name: "Enviar clave temporal" }));
    const busy = await screen.findByRole("button", { name: "Enviando…" });
    expect(busy).toBeDisabled();
    await user.click(busy);
    finish();

    await screen.findByRole("status");
    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1);
  });
});
