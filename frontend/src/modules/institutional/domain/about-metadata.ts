import { pageMetadata } from "@/modules/core/seo/page-metadata";

import { aboutSeo } from "../content/seo";
import { ABOUT_PATH } from "./routes";

export const aboutMetadata = pageMetadata({ ...aboutSeo, path: ABOUT_PATH });
