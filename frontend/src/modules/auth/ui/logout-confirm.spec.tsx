import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogoutConfirm } from "./LogoutConfirm";

const logout = vi.fn();

vi.mock("../application/useLogout", () => ({ useLogout: () => ({ logout, isBusy: false }) }));

const renderTrigger = () =>
  render(
    <LogoutConfirm>
      <button type="button">Salir</button>
    </LogoutConfirm>,
  );

beforeEach(() => {
  logout.mockReset();
});

describe("LogoutConfirm", () => {
  it("asks before closing the session and does nothing yet", async () => {
    const person = userEvent.setup();
    renderTrigger();

    await person.click(screen.getByRole("button", { name: "Salir" }));

    const dialog = await screen.findByRole("alertdialog", { name: "¿Cerrar sesión?" });
    expect(dialog).toHaveTextContent("Las sesiones de otros dispositivos siguen abiertas.");
    expect(logout).not.toHaveBeenCalled();
  });

  it("closes the session once confirmed", async () => {
    const person = userEvent.setup();
    renderTrigger();

    await person.click(screen.getByRole("button", { name: "Salir" }));
    await person.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("leaves the session alone when cancelled", async () => {
    const person = userEvent.setup();
    renderTrigger();

    await person.click(screen.getByRole("button", { name: "Salir" }));
    await person.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("is cancelled with Escape and gives the focus back to its control", async () => {
    const person = userEvent.setup();
    renderTrigger();

    await person.click(screen.getByRole("button", { name: "Salir" }));
    await screen.findByRole("alertdialog");
    await person.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toHaveFocus();
    expect(logout).not.toHaveBeenCalled();
  });
});
