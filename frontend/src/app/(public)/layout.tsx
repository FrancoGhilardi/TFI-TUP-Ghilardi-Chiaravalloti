import { StoreShell } from "@/modules/site-layout";

const PublicLayout = ({ children }: LayoutProps<"/">) => {
  return <StoreShell>{children}</StoreShell>;
};

export default PublicLayout;
