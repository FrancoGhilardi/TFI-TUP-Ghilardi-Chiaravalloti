import { authContent } from "../content/auth";
import { AuthCard } from "./AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

/** The screen to ask for a temporary password by email. */
export const ForgotPasswordPage = () => {
  const { title, lead } = authContent.forgotPassword;
  return (
    <AuthCard title={title} lead={lead}>
      <ForgotPasswordForm />
    </AuthCard>
  );
};
