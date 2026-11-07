"use client";

import type { useChangePassword } from "../application/useChangePassword";
import { Button } from "@/modules/core/ui/primitives/button";

import { authContent } from "../content/auth";
import { FormAlert } from "./FormAlert";
import { FormNotice } from "./FormNotice";
import { PasswordField } from "./PasswordField";

type ChangePasswordFormProps = ReturnType<typeof useChangePassword>;

export const ChangePasswordForm = ({
  form,
  submit,
  isBusy,
  errorMessage,
  successMessage,
}: ChangePasswordFormProps) => {
  const { register, formState } = form;
  const {
    currentPassword,
    newPassword,
    confirmPassword,
    submit: submitLabel,
    submitting,
  } = authContent.changePassword;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert message={errorMessage} />
      <FormNotice message={successMessage} />
      <PasswordField
        id="change-password-current"
        autoComplete="current-password"
        label={currentPassword.label}
        placeholder={currentPassword.placeholder}
        error={formState.errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <PasswordField
        id="change-password-new"
        autoComplete="new-password"
        label={newPassword.label}
        placeholder={newPassword.placeholder}
        error={formState.errors.newPassword?.message}
        {...register("newPassword")}
      />
      <PasswordField
        id="change-password-confirm"
        autoComplete="new-password"
        label={confirmPassword.label}
        placeholder={confirmPassword.placeholder}
        error={formState.errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" disabled={isBusy} className="h-12 w-full text-base">
        {isBusy ? submitting : submitLabel}
      </Button>
    </form>
  );
};
