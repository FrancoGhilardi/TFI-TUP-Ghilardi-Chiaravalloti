import { type CatalogParam, catalogParamEntries, type CatalogQuery } from "../domain/catalog-query";

interface HiddenQueryFieldsProps {
  query: CatalogQuery;
  /** Parameters the form itself sets; the page is always left out so a new submit starts at 1. */
  except: CatalogParam[];
}

/** Carries the rest of the catalog state through a `GET` form, so submitting keeps it. */
export const HiddenQueryFields = ({ query, except }: HiddenQueryFieldsProps) => {
  return catalogParamEntries(query, [...except, "page"]).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));
};
