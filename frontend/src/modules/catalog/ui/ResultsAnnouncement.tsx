import type { CatalogView } from "../application/catalog-view";
import { catalogContent } from "../content/catalog";

interface ResultsAnnouncementProps {
  view: CatalogView;
}

function announcementOf(view: CatalogView): string {
  const { announcement, total } = catalogContent;
  return view.kind === "results" ? total(view.page.totalItems) : announcement[view.kind];
}

/**
 * Tells screen-reader users what a search or filter change produced. It stays mounted across
 * navigations, as a live region must, and only its text changes.
 */
export const ResultsAnnouncement = ({ view }: ResultsAnnouncementProps) => {
  return (
    <p role="status" className="sr-only">
      {announcementOf(view)}
    </p>
  );
};
