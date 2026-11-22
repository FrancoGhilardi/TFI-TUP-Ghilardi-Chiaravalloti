import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionsHeaderCell } from "./ActionsHeaderCell";
import { HeaderCell } from "./HeaderCell";
import { ListRow } from "./ListRow";
import { ListTable } from "./ListTable";
import { RowActionsCell } from "./RowActionsCell";
import { RowCell } from "./RowCell";
import { RowLeadCell } from "./RowLeadCell";

const renderTable = (deleted = false) =>
  render(
    <ListTable
      caption="Lista de precios"
      head={
        <>
          <HeaderCell>Producto</HeaderCell>
          <HeaderCell numeric>Precio</HeaderCell>
          <ActionsHeaderCell label="Acciones" />
        </>
      }
    >
      <ListRow deleted={deleted}>
        <RowLeadCell>Cuaderno</RowLeadCell>
        <RowCell label="Precio" numeric>
          $ 1.500
        </RowCell>
        <RowActionsCell>
          <button type="button">Abrir</button>
        </RowActionsCell>
      </ListRow>
    </ListTable>,
  );

describe("ListTable", () => {
  it("is a table named by its caption, with a column title for each column", () => {
    renderTable();

    const table = screen.getByRole("table", { name: "Lista de precios" });
    expect(within(table).getByRole("columnheader", { name: "Producto" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Precio" })).toBeInTheDocument();
  });

  it("names the actions column for assistive technology", () => {
    renderTable();

    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
  });

  it("aligns the title of a numeric column to the right", () => {
    renderTable();

    expect(screen.getByRole("columnheader", { name: "Producto" })).toHaveClass("text-left");
    expect(screen.getByRole("columnheader", { name: "Precio" })).toHaveClass("text-right");
  });
});

describe("ListRow", () => {
  it("holds the cells of one record", () => {
    renderTable();

    const row = screen.getByRole("row", { name: /Cuaderno/ });
    expect(within(row).getByRole("cell", { name: "Cuaderno" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Abrir" })).toBeInTheDocument();
  });

  it("is muted when the record was given a logical delete", () => {
    renderTable(true);

    expect(screen.getByRole("row", { name: /Cuaderno/ })).toHaveClass("bg-wheat/40");
  });

  it("is not muted otherwise", () => {
    renderTable(false);

    expect(screen.getByRole("row", { name: /Cuaderno/ })).not.toHaveClass("bg-wheat/40");
  });
});

describe("RowCell", () => {
  it("carries its column title, which a small screen shows beside the value", () => {
    renderTable();

    const cell = screen.getByRole("cell", { name: "$ 1.500" });
    expect(cell).toHaveAttribute("data-label", "Precio");
    expect(cell).toHaveClass("md:text-right");
  });
});
