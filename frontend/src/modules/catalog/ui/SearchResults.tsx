import type { ReactNode } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import type { StoreSearchState } from "../application/useStoreSearch";
import { searchContent } from "../content/search";
import { hasSuggestions } from "../domain/search-term";
import { SearchAllLink } from "./SearchAllLink";
import { SuggestionGroups } from "./SuggestionGroups";

interface SearchResultsProps {
  search: StoreSearchState;
  /** The visitor tried to search with too little text: the hint turns into an alert. */
  needsMoreText: boolean;
  onNavigate: () => void;
}

/** What the results area shows for each moment of the search; never a blank area. */
export const SearchResults = ({ search, needsMoreText, onNavigate }: SearchResultsProps) => {
  const { term, status, suggestions, retry } = search;

  if (term === undefined) {
    // A different key remounts the text, so assistive technology announces it as an alert.
    return needsMoreText ? (
      <p
        key="needs-more"
        role="alert"
        className="px-3 py-2 text-sm font-semibold text-coral-strong"
      >
        {searchContent.hint}
      </p>
    ) : (
      <p key="hint" className="px-3 py-2 text-sm text-ink-soft">
        {searchContent.hint}
      </p>
    );
  }

  const seeAll = <SearchAllLink term={term} onNavigate={onNavigate} />;

  if (status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <div role="alert" className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <p className="text-ink">{searchContent.error}</p>
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            {searchContent.retry}
          </Button>
        </div>
        {seeAll}
      </div>
    );
  }

  if (!suggestions) {
    return <p className="px-3 py-2 text-sm text-ink-soft">{searchContent.loading}</p>;
  }

  // An old empty answer says nothing about the new term until its own answer arrives.
  let body: ReactNode;
  if (hasSuggestions(suggestions)) {
    body = <SuggestionGroups suggestions={suggestions} onNavigate={onNavigate} />;
  } else if (status === "loading") {
    body = <p className="px-3 py-2 text-sm text-ink-soft">{searchContent.loading}</p>;
  } else {
    body = <p className="px-3 py-2 text-sm text-ink-soft">{searchContent.empty(term)}</p>;
  }

  return (
    <div aria-busy={status === "loading"} className="flex flex-col gap-3">
      {body}
      {seeAll}
    </div>
  );
};
