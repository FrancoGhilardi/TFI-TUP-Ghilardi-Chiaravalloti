import { pageMetadata } from "@/modules/core/seo/page-metadata";

import { homeSeo } from "../content/seo";
import { HOME_PATH } from "./routes";

export const homeMetadata = pageMetadata({ ...homeSeo, path: HOME_PATH });
