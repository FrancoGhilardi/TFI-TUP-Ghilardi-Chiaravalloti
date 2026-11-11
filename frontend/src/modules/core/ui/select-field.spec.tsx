import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "./SelectField";

const options = [
  { value: "", label: "Ninguna" },
  { value: "a", label: "Libros" },
  { value: "b", label: "Útiles" },
];

describe("SelectField", () => {
  it("is a labelled select with its options, showing the value it is given", () => {
    render(
      <SelectField
        id="padre"
        label="Categoría padre"
        options={options}
        value="b"
        onChange={() => {}}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Categoría padre" });
    expect(select).toHaveValue("b");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Ninguna",
      "Libros",
      "Útiles",
    ]);
  });

  it("reports the option chosen, also from the keyboard", async () => {
    const onChange = vi.fn();
    const person = userEvent.setup();
    render(
      <SelectField
        id="padre"
        label="Categoría padre"
        options={options}
        value=""
        onChange={onChange}
      />,
    );

    await person.selectOptions(screen.getByRole("combobox"), "a");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ties its error to the select and marks it invalid", () => {
    render(
      <SelectField
        id="padre"
        label="Categoría padre"
        options={options}
        error="No puede ser esa."
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInvalid();
    expect(select).toHaveAccessibleDescription("No puede ser esa.");
  });

  it("shows its hint while it has no error, tied to the select", () => {
    const { rerender } = render(
      <SelectField id="padre" label="Categoría padre" options={options} hint="Elegí dónde va." />,
    );
    expect(screen.getByRole("combobox")).toHaveAccessibleDescription("Elegí dónde va.");

    rerender(
      <SelectField
        id="padre"
        label="Categoría padre"
        options={options}
        hint="Elegí dónde va."
        error="Mal."
      />,
    );

    expect(screen.queryByText("Elegí dónde va.")).not.toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<SelectField id="padre" label="Categoría padre" options={options} disabled />);

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
