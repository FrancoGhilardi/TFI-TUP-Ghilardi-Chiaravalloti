"use client";

import type { ReactNode } from "react";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { useLogout } from "../application/useLogout";
import { authContent } from "../content/auth";

interface LogoutConfirmProps {
  /** The control that opens the confirmation; it keeps its own look. */
  children: ReactNode;
}

/** Asks before closing the session, so a stray click does not log the person out. */
export const LogoutConfirm = ({ children }: LogoutConfirmProps) => {
  const { logout, isBusy } = useLogout();
  const { label, title, description, cancel } = authContent.logout;

  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={label}
      cancelLabel={cancel}
      onConfirm={logout}
      disabled={isBusy}
    >
      {children}
    </ConfirmDialog>
  );
};
