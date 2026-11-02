import { SearchForm } from "@/modules/catalog";

/** Sends the search to the catalog as `/productos?q=…`. */
export const HeroSearch = () => {
  return (
    <SearchForm
      inputId="busqueda-portada"
      label="Buscar productos"
      placeholder="Buscá un libro, un cuaderno, una marca…"
      className="mt-6 w-full max-w-md py-1.5 pr-1.5 shadow-soft max-[860px]:mx-auto"
    />
  );
};
