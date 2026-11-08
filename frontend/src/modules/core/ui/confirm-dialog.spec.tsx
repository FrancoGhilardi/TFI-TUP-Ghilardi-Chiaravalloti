import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

const renderDialog = (props: { disabled?: boolean } = {}) => {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      title="¿Dar de baja?"
      description="Podés reactivarlo cuando quieras."
      confirmLabel="Dar de baja"
      onConfirm={onConfirm}
      {...props}
    >
      <button type="button">Abrir</button>
    </ConfirmDialog>,
  );
  return onConfirm;
};

describe("ConfirmDialog", () => {
  it("asks first and does nothing until confirmed", async () => {
    const person = userEvent.setup();
    const onConfirm = renderDialog();

    await person.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = await screen.findByRole("alertdialog", { name: "¿Dar de baja?" });
    expect(dialog).toHaveTextContent("Podés reactivarlo cuando quieras.");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("runs the action once when confirmed", async () => {
    const person = userEvent.setup();
    const onConfirm = renderDialog();

    await person.click(screen.getByRole("button", { name: "Abrir" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing when cancelled", async () => {
    const person = userEvent.setup();
    const onConfirm = renderDialog();

    await person.click(screen.getByRole("button", { name: "Abrir" }));
    await person.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("is cancelled with Escape and gives the focus back to its control", async () => {
    const person = userEvent.setup();
    const onConfirm = renderDialog();

    await person.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("alertdialog");
    await person.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not let the action be confirmed while it is disabled", async () => {
    const person = userEvent.setup();
    const onConfirm = renderDialog({ disabled: true });

    await person.click(screen.getByRole("button", { name: "Abrir" }));
    const confirm = await screen.findByRole("button", { name: "Dar de baja" });
    await person.click(confirm);

    expect(confirm).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
