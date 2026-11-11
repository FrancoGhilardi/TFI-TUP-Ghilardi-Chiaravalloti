import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ArchivedNotice } from "./ArchivedNotice";
import { FormSkeleton } from "./FormSkeleton";
import { LoadErrorState } from "./LoadErrorState";
import { NotFoundState } from "./NotFoundState";
import { OutOfRangeState } from "./OutOfRangeState";
import { TableSkeleton } from "./TableSkeleton";

describe("LoadErrorState", () => {
  it("announces what failed and asks again on request", async () => {
    const onRetry = vi.fn();
    const person = userEvent.setup();
    render(
      <LoadErrorState
        title="No pudimos cargar"
        text="Revisá tu conexión."
        retry="Reintentar"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("NotFoundState", () => {
  it("says it does not exist and leads back", () => {
    render(
      <NotFoundState
        title="No encontramos eso"
        text="Quizás ya no existe."
        action="Volver"
        href="/admin/lista"
      />,
    );

    expect(screen.getByRole("heading", { name: "No encontramos eso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/admin/lista");
  });
});

describe("OutOfRangeState", () => {
  it("offers the first page of the same list", () => {
    render(
      <OutOfRangeState
        title="Esa página no existe"
        text="Hay menos."
        action="Ir a la primera"
        firstPageHref="/lista?q=a"
      />,
    );

    expect(screen.getByRole("link", { name: "Ir a la primera" })).toHaveAttribute(
      "href",
      "/lista?q=a",
    );
  });
});

describe("ArchivedNotice", () => {
  it("says why it is read-only and brings it back on request", async () => {
    const onAction = vi.fn();
    const person = userEvent.setup();
    render(
      <ArchivedNotice
        message="Está dada de baja."
        actionLabel="Reactivar"
        pending={false}
        onAction={onAction}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Está dada de baja.");
    await person.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("cannot be asked again while the request is on its way", () => {
    render(<ArchivedNotice message="x" actionLabel="Reactivar" pending onAction={() => {}} />);

    expect(screen.getByRole("button", { name: "Reactivar" })).toBeDisabled();
  });
});

describe("skeletons", () => {
  it("hold the place of a table and of a form, saying so to assistive technology", () => {
    render(
      <>
        <TableSkeleton label="Cargando filas" />
        <FormSkeleton label="Cargando formulario" />
      </>,
    );

    expect(screen.getByLabelText("Cargando filas")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Cargando formulario")).toHaveAttribute("aria-busy", "true");
  });
});
