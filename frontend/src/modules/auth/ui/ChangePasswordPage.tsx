"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import { useChangePassword } from "../application/useChangePassword";
import { authContent } from "../content/auth";
import { ADMIN_PATHS } from "../domain/routes";
import { AuthCard } from "./AuthCard";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { LogoutConfirm } from "./LogoutConfirm";

/**
 * The screen of the change a temporary password requires: alone, without the panel around it, and
 * with a way to sign out. Someone with nothing pending changes their password from their account.
 */
export const ChangePasswordPage = () => {
  const router = useRouter();
  const change = useChangePassword();
  const { title, leadRequired } = authContent.changePassword;

  useEffect(() => {
    if (!change.isRequired) {
      router.replace(ADMIN_PATHS.account);
    }
  }, [change.isRequired, router]);

  if (!change.isRequired) {
    return null;
  }
  return (
    <AuthCard title={title} lead={leadRequired}>
      <ChangePasswordForm {...change} />
      <div className="mt-4 flex justify-center">
        <LogoutConfirm>
          <Button type="button" variant="ghost">
            {authContent.logout.label}
          </Button>
        </LogoutConfirm>
      </div>
    </AuthCard>
  );
};
