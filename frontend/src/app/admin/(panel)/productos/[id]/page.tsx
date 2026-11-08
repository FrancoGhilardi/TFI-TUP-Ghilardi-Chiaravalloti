import { EditProductPage } from "@/modules/admin-products";

const AdminProductPage = async ({ params }: PageProps<"/admin/productos/[id]">) => {
  const { id } = await params;
  return <EditProductPage id={id} />;
};

export default AdminProductPage;
