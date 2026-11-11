import { EditUserPage } from "@/modules/admin-users";

const AdminUserPage = async ({ params }: PageProps<"/admin/usuarios/[id]">) => {
  const { id } = await params;
  return <EditUserPage id={id} />;
};

export default AdminUserPage;
