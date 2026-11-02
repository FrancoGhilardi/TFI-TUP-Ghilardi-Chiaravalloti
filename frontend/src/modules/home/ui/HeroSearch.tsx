import { Search } from "lucide-react";

import { CATALOG_PATH } from "@/modules/catalog";
import { Button } from "@/modules/core/ui/primitives/button";

const SEARCH_INPUT_ID = "busqueda-portada";

/** Sends the search to the catalog as `/productos?q=…`; a plain form, so it works without JavaScript. */
export const HeroSearch = () => {
  return (
    <form
      role="search"
      action={CATALOG_PATH}
      method="get"
      className="mt-6 flex w-full max-w-md items-center gap-2.5 rounded-full border-[1.5px] border-line bg-surface py-1.5 pr-1.5 pl-4 shadow-soft focus-within:border-teal max-[860px]:mx-auto"
    >
      <Search className="size-4.5 shrink-0 text-ink-soft" aria-hidden="true" />
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        Buscar productos
      </label>
      <input
        id={SEARCH_INPUT_ID}
        name="q"
        type="search"
        required
        minLength={2}
        maxLength={100}
        placeholder="Buscá un libro, un cuaderno, una marca…"
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
      />
      <Button type="submit" size="sm">
        Buscar
      </Button>
    </form>
  );
};
