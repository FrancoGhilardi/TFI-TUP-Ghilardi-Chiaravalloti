"use client";

import { useChangePassword } from "../application/useChangePassword";
import { ChangePasswordForm } from "./ChangePasswordForm";

/** The form to change the own password by choice, to place inside another screen. */
export const ChangePasswordSection = () => {
  return <ChangePasswordForm {...useChangePassword()} />;
};
