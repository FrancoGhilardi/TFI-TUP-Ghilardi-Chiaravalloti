"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useStoreSearch } from "../application/useStoreSearch";
import { searchContent } from "../content/search";
import { SEARCH_MAX_LENGTH, searchableTerm } from "../domain/catalog-query";
import { searchResultsHref } from "../domain/search-term";
import { SearchAnnouncement } from "./SearchAnnouncement";
import { SearchResults } from "./SearchResults";

const INPUT_ID = "busqueda-global";

interface SearchBoxProps {
  /** Called when the visitor leaves for another page, so the host can close. */
  onNavigate: () => void;
}

/** The field and the suggestions for what is typed in it; Enter goes to the catalog. */
export const SearchBox = ({ onNavigate }: SearchBoxProps) => {
  const router = useRouter();
  const [text, setText] = useState("");
  const [needsMoreText, setNeedsMoreText] = useState(false);
  const search = useStoreSearch(text);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The typed text, not the debounced one: Enter right after the last key must not wait.
    const term = searchableTerm(text);
    if (term === undefined) {
      setNeedsMoreText(true);
      return;
    }
    router.push(searchResultsHref(term));
    onNavigate();
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={submit}
        className="flex items-center gap-2.5 rounded-full border-[1.5px] border-line bg-surface px-4 focus-within:border-teal"
      >
        <Search className="size-4.5 shrink-0 text-ink-soft" aria-hidden="true" />
        <label htmlFor={INPUT_ID} className="sr-only">
          {searchContent.label}
        </label>
        <input
          id={INPUT_ID}
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setNeedsMoreText(false);
          }}
          aria-invalid={needsMoreText}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          placeholder={searchContent.placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
        />
      </form>
      <SearchAnnouncement search={search} />
      <SearchResults search={search} needsMoreText={needsMoreText} onNavigate={onNavigate} />
    </div>
  );
};
