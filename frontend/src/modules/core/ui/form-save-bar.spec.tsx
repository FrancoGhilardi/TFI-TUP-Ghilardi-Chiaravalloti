import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormSaveBar } from "./FormSaveBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const leave = {
  title: "¿Salir sin guardar?",
  description: "Los cambios se pierden.",
  confirm: "Salir",
  keep: "Seguir editando",
};

const renderBar = (props: Partial<Parameters<typeof FormSaveBar>[0]> = {}) =>
  render(
    <form>
      <FormSaveBar
        message="Sin cambios"
        changed={false}
        canSave
        saving={false}
        submitLabel="Guardar"
        savingLabel="Guardando…"
        cancelLabel="Cancelar"
        leaveHref="/admin/lista"
        leave={leave}
        {...props}
      />
    </form>,
  );

beforeEach(() => {
  push.mockReset();
});

describe("FormSaveBar", () => {
  it("says the state of the form", () => {
    renderBar({ message: "Hay cambios sin guardar" });

    expect(screen.getByRole("status")).toHaveTextContent("Hay cambios sin guardar");
  });

  it("leaves with a plain link while nothing was changed", () => {
    renderBar();

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/admin/lista");
  });

  it("asks before leaving once something changed, and only then goes", async () => {
    const person = userEvent.setup();
    renderBar({ changed: true });

    await person.click(screen.getByRole("button", { name: "Cancelar" }));
    await person.click(await screen.findByRole("button", { name: "Seguir editando" }));
    expect(push).not.toHaveBeenCalled();
    await person.click(screen.getByRole("button", { name: "Cancelar" }));
    await person.click(await screen.findByRole("button", { name: "Salir" }));

    expect(push).toHaveBeenCalledWith("/admin/lista");
  });

  it("cannot be saved when there is nothing to save, nor while it is saving", () => {
    const { unmount } = renderBar({ canSave: false });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    unmount();

    renderBar({ saving: true });

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("submits the form it is in", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const person = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <FormSaveBar
          message=""
          changed={false}
          canSave
          saving={false}
          submitLabel="Guardar"
          savingLabel="Guardando…"
          cancelLabel="Cancelar"
          leaveHref="/x"
          leave={leave}
        />
      </form>,
    );

    await person.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
