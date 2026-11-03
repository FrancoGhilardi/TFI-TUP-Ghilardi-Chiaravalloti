import { LoginPage, loginMetadata } from "@/modules/auth";

export const metadata = loginMetadata;

const AdminLoginPage = async ({ searchParams }: PageProps<"/admin/login">) => {
  const { next } = await searchParams;
  return <LoginPage next={Array.isArray(next) ? next[0] : next} />;
};

export default AdminLoginPage;
