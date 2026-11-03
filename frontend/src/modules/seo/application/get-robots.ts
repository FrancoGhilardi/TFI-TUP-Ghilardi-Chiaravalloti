import type { MetadataRoute } from "next";

import { publicConfig } from "@/modules/core/config/env";

import { robotsRules } from "../domain/robots";

export function getRobots(): MetadataRoute.Robots {
  return robotsRules(publicConfig.siteOrigin);
}
