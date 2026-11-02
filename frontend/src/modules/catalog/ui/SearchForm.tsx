import { Search } from "lucide-react";
import Form from "next/form";

import { cn } from "@/modules/core/lib/utils";
import { Button } from "@/modules/core/ui/primitives/button";

import { catalogContent } from "../content/catalog";
import {
  CATALOG_PARAMS,
  type CatalogQuery,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
} from "../domain/catalog-query";
import { CATALOG_PATH } from "../domain/product-routes";
import { HiddenQueryFields } from "./HiddenQueryFields";

/** At least two characters other than spaces: the catalog drops anything shorter once trimmed. */
const SEARCH_PATTERN = ".*\\S.*\\S.*";

interface SearchFormProps {
  inputId: string;
  label: string;
  placeholder: string;
  /** Current catalog state to keep (category, filters, sort); none from other pages. */
  query?: CatalogQuery;
  className?: string;
}

/**
 * Search box that sends `q` to the catalog. Client-side navigation through `next/form`, and a
 * plain `GET` form without JavaScript.
 */
export const SearchForm = ({ inputId, label, placeholder, query, className }: SearchFormProps) => {
  const { submit, tooShort } = catalogContent.search;
  return (
    <Form
      // A new search resets the box after a navigation that changed `q` (a removed chip).
      key={query?.q ?? ""}
      role="search"
      action={CATALOG_PATH}
      className={cn(
        "flex items-center gap-2.5 rounded-full border-[1.5px] border-line bg-surface py-1 pr-1 pl-4 focus-within:border-teal",
        className,
      )}
    >
      {query && <HiddenQueryFields query={query} except={["q"]} />}
      <Search className="size-4.5 shrink-0 text-ink-soft" aria-hidden="true" />
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        name={CATALOG_PARAMS.q}
        type="search"
        required
        defaultValue={query?.q}
        minLength={SEARCH_MIN_LENGTH}
        maxLength={SEARCH_MAX_LENGTH}
        pattern={SEARCH_PATTERN}
        title={tooShort}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
      />
      <Button type="submit" size="sm">
        {submit}
      </Button>
    </Form>
  );
};
