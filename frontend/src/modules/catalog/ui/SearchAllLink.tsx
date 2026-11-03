import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { whenPlainClick } from "@/modules/core/lib/events";
import { cn } from "@/modules/core/lib/utils";

import { searchContent } from "../content/search";
import { searchResultsHref } from "../domain/search-term";
import { searchRowStyles } from "./searchResultStyles";

interface SearchAllLinkProps {
  term: string;
  onNavigate: () => void;
}

/** The way to the catalog with the term, always on offer once there is something to search. */
export const SearchAllLink = ({ term, onNavigate }: SearchAllLinkProps) => {
  return (
    <Link
      href={searchResultsHref(term)}
      onClick={whenPlainClick(onNavigate)}
      className={cn(searchRowStyles, "justify-between text-teal")}
    >
      {searchContent.seeAll(term)}
      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
};
