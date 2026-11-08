"use client";

import Link from "next/link";

import { Button } from "@/modules/core/ui/primitives/button";
import { TextField } from "@/modules/core/ui/TextField";

import { useForgotPassword } from "../application/useForgotPassword";
import { authContent } from "../content/auth";
import { ADMIN_PATHS } from "../domain/routes";
import { FormAlert } from "@/modules/core/ui/FormAlert";
import { FormNotice } from "@/modules/core/ui/FormNotice";

const LINK_CLASS =
  "rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

export const ForgotPasswordForm = () => {
  const { form, submit, isBusy, isSent, errorMessage, startOver } = useForgotPassword();
  const { register, formState } = form;
  const {
    submit: submitLabel,
    submitting,
    sent,
    backToLogin,
    otherEmail,
  } = authContent.forgotPassword;

  return (
    <div className="flex flex-col gap-4">
      <FormNotice message={isSent ? sent : null} />
      {isSent ? (
        <div className="flex flex-col items-start gap-2">
          <Link href={ADMIN_PATHS.login} className={LINK_CLASS}>
            {backToLogin}
          </Link>
          <button type="button" onClick={startOver} className={LINK_CLASS}>
            {otherEmail}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <FormAlert message={errorMessage} />
          <TextField
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            label={authContent.login.email.label}
            placeholder={authContent.login.email.placeholder}
            error={formState.errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" disabled={isBusy} className="h-12 w-full text-base">
            {isBusy ? submitting : submitLabel}
          </Button>
        </form>
      )}
    </div>
  );
};
