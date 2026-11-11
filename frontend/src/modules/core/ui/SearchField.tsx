import { Search } from "lucide-react";

import { useDebouncedInput } from "@/modules/core/hooks/useDebouncedInput";
import { Input } from "@/modules/core/ui/primitives/input";
import { Label } from "@/modules/core/ui/primitives/label";

/** How long the typing pauses before the search is applied. */
const SEARCH_PAUSE_MS = 300;

interface SearchFieldProps {
  id: string;
  label: string;
  placeholder: string;
  maxLength: number;
  /** The search as the address has it. */
  value: string;
  onSearch: (text: string) => void;
}

/** A search box that waits for the typing to pause, and follows the address when it changes. */
export const SearchField = ({
  id,
  label,
  placeholder,
  maxLength,
  value,
  onSearch,
}: SearchFieldProps) => {
  const [text, setText] = useDebouncedInput(value, onSearch, SEARCH_PAUSE_MS);

  return (
    <div className="relative min-w-60 flex-1">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
        className="pl-10"
      />
    </div>
  );
};
