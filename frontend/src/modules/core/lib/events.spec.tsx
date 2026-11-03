import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { whenPlainClick } from "./events";

describe("whenPlainClick", () => {
  const renderLink = () => {
    const callback = vi.fn();
    render(
      <a href="#destino" onClick={whenPlainClick(callback)}>
        destino
      </a>,
    );
    return { callback, link: screen.getByRole("link") };
  };

  it("runs for a plain left click", () => {
    const { callback, link } = renderLink();

    fireEvent.click(link);

    expect(callback).toHaveBeenCalledOnce();
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["middle", { button: 1 }],
  ])("does not run for a %s click", (_name, init) => {
    const { callback, link } = renderLink();

    fireEvent.click(link, init);

    expect(callback).not.toHaveBeenCalled();
  });
});
