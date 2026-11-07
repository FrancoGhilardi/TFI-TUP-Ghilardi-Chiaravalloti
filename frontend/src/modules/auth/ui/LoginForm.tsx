"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/modules/core/ui/primitives/button";
import { TextField } from "@/modules/core/ui/TextField";

import { useLogin } from "../application/useLogin";
import { authContent } from "../content/auth";
import { ADMIN_PATHS } from "../domain/routes";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";

interface LoginFormProps {
  /** Address the person was heading to when they were sent to sign in. */
  next?: string;
}

export const LoginForm = ({ next }: LoginFormProps) => {
  const { form, submit, isBusy, errorMessage } = useLogin(next);
  const { register, formState } = form;
  const { email, password, forgotPassword, submit: submitLabel, submitting } = authContent.login;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert message={errorMessage} />
      <TextField
        id="login-email"
        type="email"
        autoComplete="username"
        label={email.label}
        placeholder={email.placeholder}
        error={formState.errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        id="login-password"
        autoComplete="current-password"
        label={password.label}
        placeholder={password.placeholder}
        error={formState.errors.password?.message}
        {...register("password")}
      />
      <div className="-mt-1 flex justify-end">
        <Link
          href={ADMIN_PATHS.forgotPassword}
          prefetch={false}
          className="rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {forgotPassword}
        </Link>
      </div>
      <Button type="submit" disabled={isBusy} className="h-12 w-full text-base">
        {isBusy ? (
          submitting
        ) : (
          <>
            {submitLabel}
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
};
