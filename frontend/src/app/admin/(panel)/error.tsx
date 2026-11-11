"use client";

import { PanelErrorPage } from "@/modules/admin-shell";

interface AdminErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

const AdminError = ({ error, retry }: AdminErrorProps) => {
  return <PanelErrorPage retry={retry} digest={error.digest} />;
};

export default AdminError;
