import { catalogContent } from "../content/catalog";
import type { CatalogQuery } from "../domain/catalog-query";
import { SearchForm } from "./SearchForm";

interface CatalogSearchProps {
  query: CatalogQuery;
}

/** Searches within the current category, filters and sort. */
export const CatalogSearch = ({ query }: CatalogSearchProps) => {
  const { label, placeholder } = catalogContent.search;
  return (
    <SearchForm
      inputId="busqueda-catalogo"
      label={label}
      placeholder={placeholder}
      query={query}
      className="min-w-0 flex-1"
    />
  );
};
