import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Archive, Pencil } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { BlockedRowAction } from "./BlockedRowAction";
import { ConfirmRowAction } from "./ConfirmRowAction";
import { RowActionButton } from "./RowActionButton";
import { RowActionLink } from "./RowActionLink";
import { RowActions } from "./RowActions";

describe("RowActionLink", () => {
  it("is a link named by its label, also as the hover title", () => {
    render(<RowActionLink icon={Pencil} label="Editar Cuaderno" href="/admin/productos/1" />);

    const link = screen.getByRole("link", { name: "Editar Cuaderno" });
    expect(link).toHaveAttribute("href", "/admin/productos/1");
    expect(link).toHaveAttribute("title", "Editar Cuaderno");
  });
});

describe("RowActionButton", () => {
  it("runs its action when pressed", async () => {
    const onClick = vi.fn();
    const person = userEvent.setup();
    render(<RowActionButton icon={Archive} label="Dar de baja Cuaderno" onClick={onClick} />);

    await person.click(screen.getByRole("button", { name: "Dar de baja Cuaderno" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", async () => {
    const onClick = vi.fn();
    const person = userEvent.setup();
    render(<RowActionButton icon={Archive} label="Dar de baja" disabled onClick={onClick} />);

    await person.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a button that submits nothing", () => {
    render(<RowActionButton icon={Archive} label="Dar de baja" />);

    expect(screen.getByRole("button", { name: "Dar de baja" })).toHaveAttribute("type", "button");
  });
});

describe("ConfirmRowAction", () => {
  const renderAction = (pending = false) => {
    const onConfirm = vi.fn();
    render(
      <ConfirmRowAction
        icon={Archive}
        label="Dar de baja Cuaderno"
        dialog={{
          title: "¿Dar de baja Cuaderno?",
          description: "Podés reactivarlo.",
          confirm: "Dar de baja",
        }}
        onConfirm={onConfirm}
        pending={pending}
      />,
    );
    return onConfirm;
  };

  it("asks first and acts only once confirmed", async () => {
    const person = userEvent.setup();
    const onConfirm = renderAction();

    await person.click(screen.getByRole("button", { name: "Dar de baja Cuaderno" }));
    expect(
      await screen.findByRole("alertdialog", { name: "¿Dar de baja Cuaderno?" }),
    ).toHaveTextContent("Podés reactivarlo.");
    expect(onConfirm).not.toHaveBeenCalled();

    await person.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("gives the focus back to its button when the question is dismissed", async () => {
    const person = userEvent.setup();
    const onConfirm = renderAction();

    await person.click(screen.getByRole("button", { name: "Dar de baja Cuaderno" }));
    await screen.findByRole("alertdialog");
    await person.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dar de baja Cuaderno" })).toHaveFocus();
  });

  it("cannot be opened while a request for the record is on its way", () => {
    renderAction(true);

    expect(screen.getByRole("button", { name: "Dar de baja Cuaderno" })).toBeDisabled();
  });
});

describe("BlockedRowAction", () => {
  it("is disabled and says why, to everyone", () => {
    render(
      <BlockedRowAction
        icon={Archive}
        label="Dar de baja a Ana"
        reason="No podés darte de baja a vos mismo."
      />,
    );

    const button = screen.getByRole("button", { name: "Dar de baja a Ana" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "No podés darte de baja a vos mismo.");
    expect(button).toHaveAccessibleDescription("No podés darte de baja a vos mismo.");
  });
});

describe("RowActions", () => {
  it("groups the actions of a row", () => {
    render(
      <RowActions>
        <RowActionLink icon={Pencil} label="Editar" href="/a" />
        <RowActionButton icon={Archive} label="Archivar" />
      </RowActions>,
    );

    expect(screen.getByRole("link", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivar" })).toBeInTheDocument();
  });
});
