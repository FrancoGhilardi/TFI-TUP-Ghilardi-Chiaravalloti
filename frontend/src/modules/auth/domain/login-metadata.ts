import { pageMetadata } from "@/modules/core/seo/page-metadata";

import { authContent } from "../content/auth";
import { ADMIN_PATHS } from "./routes";

/** The sign-in screen is for the team, not for search results. */
export const loginMetadata = pageMetadata({
  title: authContent.login.pageTitle,
  description: authContent.login.pageDescription,
  path: ADMIN_PATHS.login,
  noIndex: true,
});
