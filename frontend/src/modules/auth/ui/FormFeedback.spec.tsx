import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormAlert } from "./FormAlert";
import { FormNotice } from "./FormNotice";

describe("FormAlert", () => {
  it("keeps an empty alert in the page and fills it with the message", () => {
    const { rerender } = render(<FormAlert message={null} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();

    rerender(<FormAlert message="No pudimos conectarnos." />);

    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent("No pudimos conectarnos.");
  });
});

describe("FormNotice", () => {
  it("keeps an empty status in the page and fills it with the message", () => {
    const { rerender } = render(<FormNotice message={null} />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(<FormNotice message="Listo." />);

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Listo.");
  });
});
