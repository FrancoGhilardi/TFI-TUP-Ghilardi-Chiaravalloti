import { Suspense } from "react";

import { PanelGate } from "@/modules/auth";

// The gate reads the address' query, which a statically built page can only do on the client.
const AdminPanelLayout = ({ children }: LayoutProps<"/admin">) => {
  return (
    <Suspense fallback={null}>
      <PanelGate>{children}</PanelGate>
    </Suspense>
  );
};

export default AdminPanelLayout;
