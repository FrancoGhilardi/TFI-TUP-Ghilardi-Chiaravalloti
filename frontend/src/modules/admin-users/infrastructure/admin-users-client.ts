import { panelApiClient } from "@/modules/auth";

import { createAdminUsersApi } from "./admin-users-api";

export const adminUsersApi = createAdminUsersApi(panelApiClient);
