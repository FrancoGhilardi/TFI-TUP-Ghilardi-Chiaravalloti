"use client";

import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/core/ui/primitives/alert-dialog";

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
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={logout} disabled={isBusy}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
