import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchField } from "./SearchField";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const renderField = (value = "", onSearch = vi.fn()) => {
  const person = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <SearchField
      id="busqueda"
      label="Buscar"
      placeholder="Buscar por nombre…"
      maxLength={100}
      value={value}
      onSearch={onSearch}
    />,
  );
  return { person, onSearch };
};

describe("SearchField", () => {
  it("is a labelled search box with its limit", () => {
    renderField("lapiz");

    const box = screen.getByRole("searchbox", { name: "Buscar" });
    expect(box).toHaveValue("lapiz");
    expect(box).toHaveAttribute("placeholder", "Buscar por nombre…");
    expect(box).toHaveAttribute("maxlength", "100");
  });

  it("reports what was typed once the typing pauses", async () => {
    const { person, onSearch } = renderField();

    await person.type(screen.getByRole("searchbox", { name: "Buscar" }), "regla");
    expect(onSearch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("regla");
  });
});
