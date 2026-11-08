import { panelApiClient } from "@/modules/auth";

import { createAdminProductImagesApi } from "./admin-product-images-api";

export const adminProductImagesApi = createAdminProductImagesApi(panelApiClient);
