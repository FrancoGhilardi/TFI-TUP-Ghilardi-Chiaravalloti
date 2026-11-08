import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

describe("Switch", () => {
  it("is toggled with the keyboard and tells its state", async () => {
    const onChange = vi.fn();
    const Wrapper = () => {
      const [on, setOn] = useState(false);
      return (
        <Switch
          aria-label="Oferta"
          checked={on}
          onCheckedChange={(next) => {
            onChange(next);
            setOn(next);
          }}
        />
      );
    };
    const person = userEvent.setup();
    render(<Wrapper />);

    const toggle = screen.getByRole("switch", { name: "Oferta" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await person.tab();
    await person.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

describe("RadioGroup", () => {
  it("moves between the options with the arrow keys and chooses with Space", async () => {
    const onChange = vi.fn();
    const person = userEvent.setup();
    render(
      <RadioGroup defaultValue="a" onValueChange={onChange} aria-label="Principal">
        <RadioGroupItem value="a" aria-label="Libros" />
        <RadioGroupItem value="b" aria-label="Útiles" />
      </RadioGroup>,
    );

    await person.tab();
    expect(screen.getByRole("radio", { name: "Libros" })).toHaveFocus();
    await person.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Útiles" })).toHaveFocus();
    await person.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("radio", { name: "Útiles" })).toBeChecked();
  });
});

describe("Popover with Command", () => {
  const renderPicker = (onSelect: (value: string) => void) =>
    render(
      <Popover>
        <PopoverTrigger>Elegir</PopoverTrigger>
        <PopoverContent>
          <Command>
            <CommandInput placeholder="Buscar" />
            <CommandList>
              <CommandEmpty>Sin resultados</CommandEmpty>
              <CommandItem value="Libros" onSelect={onSelect}>
                Libros
              </CommandItem>
              <CommandItem value="Útiles" onSelect={onSelect}>
                Útiles
              </CommandItem>
              <CommandItem value="Mochilas" disabled onSelect={onSelect}>
                Mochilas
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>,
    );

  it("opens, filters while typing and selects with Enter", async () => {
    const onSelect = vi.fn();
    const person = userEvent.setup();
    renderPicker(onSelect);

    await person.click(screen.getByRole("button", { name: "Elegir" }));
    await person.type(await screen.findByPlaceholderText("Buscar"), "úti");

    expect(screen.getByRole("option", { name: "Útiles" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Libros" })).not.toBeInTheDocument();
    await person.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("Útiles");
  });

  it("says when nothing matches and does not select a disabled item", async () => {
    const onSelect = vi.fn();
    const person = userEvent.setup();
    renderPicker(onSelect);

    await person.click(screen.getByRole("button", { name: "Elegir" }));
    await person.type(await screen.findByPlaceholderText("Buscar"), "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();

    await person.clear(screen.getByPlaceholderText("Buscar"));
    await person.click(screen.getByRole("option", { name: "Mochilas" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes with Escape and gives the focus back to its trigger", async () => {
    const person = userEvent.setup();
    renderPicker(vi.fn());

    await person.click(screen.getByRole("button", { name: "Elegir" }));
    await screen.findByPlaceholderText("Buscar");
    await person.keyboard("{Escape}");

    expect(screen.queryByPlaceholderText("Buscar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir" })).toHaveFocus();
  });
});

describe("Textarea", () => {
  it("takes text and can be marked invalid", async () => {
    const person = userEvent.setup();
    render(<Textarea aria-label="Descripción" aria-invalid />);

    await person.type(screen.getByRole("textbox", { name: "Descripción" }), "Tapa dura");

    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveValue("Tapa dura");
    expect(screen.getByRole("textbox", { name: "Descripción" })).toBeInvalid();
  });
});
