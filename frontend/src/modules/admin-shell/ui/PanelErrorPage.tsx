"use client";

import { ADMIN_PATHS } from "@/modules/auth";
import { ErrorPage } from "@/modules/core/ui/ErrorPage";

import { shellContent } from "../content/shell";

interface PanelErrorPageProps {
  /** Reads and renders the page again, as Next gives it to an error boundary. */
  retry: () => void;
  digest?: string;
}

/** What a failed screen of the panel shows, inside its frame. */
export const PanelErrorPage = ({ retry, digest }: PanelErrorPageProps) => {
  return (
    <ErrorPage
      retry={retry}
      digest={digest}
      homeHref={ADMIN_PATHS.home}
      homeLabel={shellContent.systemPages.home}
    />
  );
};
