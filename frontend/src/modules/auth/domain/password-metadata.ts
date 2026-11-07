import { pageMetadata } from "@/modules/core/seo/page-metadata";

import { authContent } from "../content/auth";
import { ADMIN_PATHS } from "./routes";

/** Like the sign-in screen, these are for the team, not for search results. */
export const forgotPasswordMetadata = pageMetadata({
  title: authContent.forgotPassword.pageTitle,
  description: authContent.forgotPassword.pageDescription,
  path: ADMIN_PATHS.forgotPassword,
  noIndex: true,
});

export const changePasswordMetadata = pageMetadata({
  title: authContent.changePassword.pageTitle,
  description: authContent.changePassword.pageDescription,
  path: ADMIN_PATHS.changePassword,
  noIndex: true,
});
