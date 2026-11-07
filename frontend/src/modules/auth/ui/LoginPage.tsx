import { authContent } from "../content/auth";
import { AuthCard } from "./AuthCard";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  /** Address the person was heading to when they were sent to sign in. */
  next?: string;
}

/** The panel's sign-in screen. */
export const LoginPage = ({ next }: LoginPageProps) => {
  const { title, lead } = authContent.login;
  return (
    <AuthCard title={title} lead={lead}>
      <LoginForm next={next} />
    </AuthCard>
  );
};
