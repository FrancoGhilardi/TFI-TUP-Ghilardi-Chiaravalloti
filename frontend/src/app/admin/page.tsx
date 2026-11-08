import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/modules/auth";

const AdminPage = () => {
  redirect(ADMIN_PATHS.products);
};

export default AdminPage;
