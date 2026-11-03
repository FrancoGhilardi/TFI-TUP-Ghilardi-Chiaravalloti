import type { StoreSearchState } from "../application/useStoreSearch";
import { searchContent } from "../content/search";
import { hasSuggestions } from "../domain/search-term";

interface SearchAnnouncementProps {
  search: Pick<StoreSearchState, "status" | "suggestions">;
}

const { announcement } = searchContent;

function announcementOf({ status, suggestions }: SearchAnnouncementProps["search"]): string {
  if (status === "error") {
    return announcement.failed;
  }
  if (status !== "success" || !suggestions) {
    return "";
  }
  return hasSuggestions(suggestions) ? announcement.found(suggestions) : announcement.none;
}

/** Tells screen-reader users what each search produced; it stays mounted and only its text changes. */
export const SearchAnnouncement = ({ search }: SearchAnnouncementProps) => {
  return (
    <p role="status" className="sr-only">
      {announcementOf(search)}
    </p>
  );
};
