import { Search } from "lucide-react";

import { useDebouncedInput } from "@/modules/core/hooks/useDebouncedInput";
import { Input } from "@/modules/core/ui/primitives/input";
import { Label } from "@/modules/core/ui/primitives/label";

import { productsContent } from "../content/products";
import { SEARCH_MAX_LENGTH } from "../domain/products-query";

/** How long the typing pauses before the search is applied. */
const SEARCH_PAUSE_MS = 300;

interface SearchFieldProps {
  /** The search as the address has it. */
  value: string;
  onSearch: (text: string) => void;
}

export const SearchField = ({ value, onSearch }: SearchFieldProps) => {
  const [text, setText] = useDebouncedInput(value, onSearch, SEARCH_PAUSE_MS);
  const { label, placeholder } = productsContent.search;

  return (
    <div className="relative min-w-60 flex-1">
      <Label htmlFor="products-search" className="sr-only">
        {label}
      </Label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
      <Input
        id="products-search"
        type="search"
        value={text}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
        className="pl-10"
      />
    </div>
  );
};
