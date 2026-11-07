import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "../application/refresh-session";
import { useSessionStore } from "../application/session-store";
import { PanelGate } from "./PanelGate";

const replace = vi.fn();
let pathname = "/admin/productos";
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("../application/refresh-session", () => ({ refreshSession: vi.fn() }));

const user = {
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta",
  role: "SELLER" as const,
  mustChangePassword: false,
};

const renderGate = () =>
  render(
    <PanelGate>
      <p>Pantalla del panel</p>
    </PanelGate>,
  );

beforeEach(() => {
  replace.mockReset();
  vi.mocked(refreshSession).mockReset();
  pathname = "/admin/productos";
  search = "";
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("PanelGate", () => {
  it("restores the session and shows nothing until it is there", async () => {
    let finish: () => void = () => {};
    vi.mocked(refreshSession).mockReturnValue(
      new Promise<boolean>((resolve) => {
        finish = () => {
          useSessionStore.getState().start({ accessToken: "t", expiresIn: 900, user });
          resolve(true);
        };
      }),
    );

    renderGate();

    expect(screen.queryByText("Pantalla del panel")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando el panel…");
    expect(refreshSession).toHaveBeenCalledTimes(1);
    act(finish);
    expect(await screen.findByText("Pantalla del panel")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends the person to sign in when the session cannot be restored", async () => {
    pathname = "/admin/cambiar-contrasena";
    vi.mocked(refreshSession).mockImplementation(async () => {
      useSessionStore.getState().expire();
      return false;
    });

    renderGate();

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Fcambiar-contrasena"),
    );
    expect(screen.queryByText("Pantalla del panel")).not.toBeInTheDocument();
  });

  it("keeps the query of the screen in the way back to sign in", async () => {
    search = "pagina=3";
    vi.mocked(refreshSession).mockImplementation(async () => {
      useSessionStore.getState().expire();
      return false;
    });

    renderGate();

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Fproductos%3Fpagina%3D3"),
    );
  });

  it("sends a person who closed the session to sign in, without a way back, and shows nothing", async () => {
    useSessionStore.getState().start({ accessToken: "t", expiresIn: 900, user });
    const { rerender } = renderGate();
    expect(screen.getByText("Pantalla del panel")).toBeInTheDocument();

    act(() => useSessionStore.getState().signOut());
    rerender(
      <PanelGate>
        <p>Pantalla del panel</p>
      </PanelGate>,
    );

    expect(screen.queryByText("Pantalla del panel")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("says the session could not be checked and lets the person try again", async () => {
    vi.mocked(refreshSession).mockImplementation(async () => {
      useSessionStore.getState().markUnavailable();
      return false;
    });
    const person = userEvent.setup();
    renderGate();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos verificar tu sesión");
    expect(replace).not.toHaveBeenCalled();
    vi.mocked(refreshSession).mockImplementation(async () => {
      useSessionStore.getState().start({ accessToken: "t", expiresIn: 900, user });
      return true;
    });
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Pantalla del panel")).toBeInTheDocument();
  });

  it("does not ask for a new session when there is one already", () => {
    useSessionStore.getState().start({ accessToken: "t", expiresIn: 900, user });

    renderGate();

    expect(screen.getByText("Pantalla del panel")).toBeInTheDocument();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("sends a person with a temporary password to change it, without showing the screen", async () => {
    useSessionStore
      .getState()
      .start({ accessToken: "t", expiresIn: 900, user: { ...user, mustChangePassword: true } });

    renderGate();

    expect(screen.queryByText("Pantalla del panel")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/cambiar-contrasena"));
  });

  it("shows the screen to change it to a person with a temporary password", () => {
    pathname = "/admin/cambiar-contrasena";
    useSessionStore
      .getState()
      .start({ accessToken: "t", expiresIn: 900, user: { ...user, mustChangePassword: true } });

    renderGate();

    expect(screen.getByText("Pantalla del panel")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
