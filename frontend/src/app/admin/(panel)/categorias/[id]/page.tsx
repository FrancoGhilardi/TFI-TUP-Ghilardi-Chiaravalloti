import { EditCategoryPage } from "@/modules/admin-categories";

const AdminCategoryPage = async ({ params }: PageProps<"/admin/categorias/[id]">) => {
  const { id } = await params;
  return <EditCategoryPage id={id} />;
};

export default AdminCategoryPage;
