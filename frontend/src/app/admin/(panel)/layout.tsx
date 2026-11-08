import { Suspense } from "react";

import { PanelShell } from "@/modules/admin-shell";
import { PanelGate } from "@/modules/auth";

// The gate reads the address' query, which a statically built page can only do on the client.
const AdminPanelLayout = ({ children }: LayoutProps<"/admin">) => {
  return (
    <Suspense fallback={null}>
      <PanelGate>
        <PanelShell>{children}</PanelShell>
      </PanelGate>
    </Suspense>
  );
};

export default AdminPanelLayout;
