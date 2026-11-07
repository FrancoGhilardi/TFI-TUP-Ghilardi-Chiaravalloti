"use client";

import { useChangePassword } from "../application/useChangePassword";
import { authContent } from "../content/auth";
import { AuthCard } from "./AuthCard";
import { ChangePasswordForm } from "./ChangePasswordForm";

/** The screen to change the own password, whether the panel requires it or the person chose to. */
export const ChangePasswordPage = () => {
  const change = useChangePassword();
  const { title, leadRequired, leadOptional } = authContent.changePassword;
  return (
    <AuthCard title={title} lead={change.isRequired ? leadRequired : leadOptional}>
      <ChangePasswordForm {...change} />
    </AuthCard>
  );
};
