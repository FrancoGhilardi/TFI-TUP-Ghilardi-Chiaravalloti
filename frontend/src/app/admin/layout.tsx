import type { Metadata } from "next";

// The panel is not for search engines, and robots.txt already asks them to stay out of it.
export const metadata: Metadata = { robots: { index: false, follow: true } };

const AdminLayout = ({ children }: LayoutProps<"/admin">) => {
  return children;
};

export default AdminLayout;
