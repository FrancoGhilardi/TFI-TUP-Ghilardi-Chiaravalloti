import { panelApiClient } from "@/modules/auth";

import { createAdminProductsApi } from "./admin-products-api";

export const adminProductsApi = createAdminProductsApi(panelApiClient);
