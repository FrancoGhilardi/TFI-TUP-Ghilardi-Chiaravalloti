import { Suspense } from "react";

import { PanelShell, PanelSkeleton } from "@/modules/admin-shell";
import { PanelGate } from "@/modules/auth";

// The gate reads the address' query, which a statically built page can only do on the client.
const AdminPanelLayout = ({ children }: LayoutProps<"/admin">) => {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <PanelGate loading={<PanelSkeleton />}>
        <PanelShell>{children}</PanelShell>
      </PanelGate>
    </Suspense>
  );
};

export default AdminPanelLayout;
