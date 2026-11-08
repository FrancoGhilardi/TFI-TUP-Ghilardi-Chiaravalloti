import { panelApiClient } from "@/modules/auth";

import { createAdminCategoriesApi } from "./admin-categories-api";

export const adminCategoriesApi = createAdminCategoriesApi(panelApiClient);
