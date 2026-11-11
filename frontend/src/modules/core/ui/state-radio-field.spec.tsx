import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StateRadioField } from "./StateRadioField";

const renderField = (props: Partial<Parameters<typeof StateRadioField>[0]> = {}) => {
  const onChange = vi.fn();
  render(
    <StateRadioField
      id="state"
      label="Estado"
      activeLabel="Activo"
      inactiveLabel="Inactivo"
      active
      onChange={onChange}
      {...props}
    />,
  );
  return onChange;
};

describe("StateRadioField", () => {
  it("is a labelled group with the current state checked", () => {
    renderField({ active: false });

    expect(screen.getByRole("radiogroup", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Activo" })).not.toBeChecked();
  });

  it("reports the state chosen, with the mouse and the keyboard", async () => {
    const onChange = renderField();
    const person = userEvent.setup();

    await person.click(screen.getByRole("radio", { name: "Inactivo" }));
    expect(onChange).toHaveBeenLastCalledWith(false);

    screen.getByRole("radio", { name: "Activo" }).focus();
    await person.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("describes the group with its hint", () => {
    renderField({ hint: "Una inactiva no se muestra." });

    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription(
      "Una inactiva no se muestra.",
    );
  });

  it("cannot be changed when disabled", async () => {
    const onChange = renderField({ disabled: true });
    const person = userEvent.setup();

    await person.click(screen.getByRole("radio", { name: "Inactivo" }));

    expect(screen.getByRole("radio", { name: "Inactivo" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
