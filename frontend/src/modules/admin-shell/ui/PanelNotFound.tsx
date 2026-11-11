import { ADMIN_PATHS } from "@/modules/auth";
import { NotFoundPage } from "@/modules/core/ui/NotFoundPage";

import { shellContent } from "../content/shell";

/** The panel's page for an address under it that leads nowhere, shown inside its frame. */
export const PanelNotFound = () => {
  return <NotFoundPage homeHref={ADMIN_PATHS.home} homeLabel={shellContent.systemPages.home} />;
};
