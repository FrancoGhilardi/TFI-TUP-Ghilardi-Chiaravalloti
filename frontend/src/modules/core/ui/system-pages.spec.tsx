import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchX } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { ErrorPage } from "./ErrorPage";
import { NotFoundPage } from "./NotFoundPage";
import { PageState } from "./PageState";
import { Skeleton } from "./Skeleton";
import { StatusMessage } from "./StatusMessage";

const robots = () => document.head.querySelector('meta[name="robots"]');

describe("StatusMessage heading", () => {
  it("is a section heading by default and the page heading when asked", () => {
    const { rerender } = render(<StatusMessage icon={SearchX} title="Sin datos" />);
    expect(screen.getByRole("heading", { level: 2, name: "Sin datos" })).toBeInTheDocument();

    rerender(<StatusMessage icon={SearchX} title="Sin datos" headingLevel="h1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Sin datos" })).toBeInTheDocument();
  });
});

describe("PageState", () => {
  it("is a page with one h1, its description and its actions", () => {
    render(
      <PageState
        icon={SearchX}
        title="Nada por acá"
        description="Probá otra cosa."
        actions={<button type="button">Volver</button>}
      />,
    );

    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Nada por acá" })).toBeInTheDocument();
    expect(screen.getByText("Probá otra cosa.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("shows the reference code only when there is one", () => {
    const { rerender } = render(<PageState icon={SearchX} title="Error" />);
    expect(screen.queryByText(/Código de referencia/)).not.toBeInTheDocument();

    rerender(<PageState icon={SearchX} title="Error" reference="abc123" />);
    expect(screen.getByText("Código de referencia: abc123")).toBeInTheDocument();
  });

  it("asks search engines to leave it out only when told to", () => {
    const { rerender, unmount } = render(<PageState icon={SearchX} title="Error" />);
    expect(robots()).toBeNull();

    rerender(<PageState icon={SearchX} title="Error" noIndex />);
    expect(robots()).toHaveAttribute("content", "noindex");

    unmount();
    expect(robots()).toBeNull();
  });
});

describe("ErrorPage", () => {
  it("announces the failure, retries and leads home", async () => {
    const retry = vi.fn();
    const person = userEvent.setup();
    render(<ErrorPage retry={retry} homeHref="/" homeLabel="Ir al inicio" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });

  it("shows the digest as the reference and nothing of the error", () => {
    render(<ErrorPage retry={() => {}} digest="d1g3st" homeHref="/" homeLabel="Ir al inicio" />);

    expect(screen.getByText("Código de referencia: d1g3st")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/stack|TypeError/i);
  });

  it("offers the extra ways out it is given and is left out of search engines", () => {
    render(
      <ErrorPage retry={() => {}} homeHref="/" homeLabel="Ir al inicio">
        <a href="https://wa.me/1">Consultar por WhatsApp</a>
      </ErrorPage>,
    );

    expect(screen.getByRole("link", { name: "Consultar por WhatsApp" })).toBeInTheDocument();
    expect(robots()).toHaveAttribute("content", "noindex");
  });
});

describe("NotFoundPage", () => {
  it("says the page does not exist and leads home, left out of search engines", () => {
    render(<NotFoundPage homeHref="/admin/inicio" homeLabel="Ir al inicio del panel" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos esa página" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio del panel" })).toHaveAttribute(
      "href",
      "/admin/inicio",
    );
    expect(robots()).toHaveAttribute("content", "noindex");
  });

  it("offers the extra ways out it is given", () => {
    render(
      <NotFoundPage homeHref="/" homeLabel="Ir al inicio">
        <button type="button">Ver productos</button>
      </NotFoundPage>,
    );

    expect(screen.getByRole("button", { name: "Ver productos" })).toBeInTheDocument();
  });
});

describe("Skeleton extra props", () => {
  it("cannot make the grey block readable by assistive technology", () => {
    const { container } = render(<Skeleton aria-hidden={false} />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology and keeps the classes it is given", () => {
    const { container } = render(<Skeleton className="h-10" />);

    const block = container.firstElementChild as HTMLElement;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("h-10", "animate-pulse");
  });
});
