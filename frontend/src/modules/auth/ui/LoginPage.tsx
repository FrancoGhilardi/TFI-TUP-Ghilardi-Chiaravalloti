import { authContent } from "../content/auth";
import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Wordmark } from "@/modules/core/ui/Wordmark";

import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  /** Address the person was heading to when they were sent to sign in. */
  next?: string;
}

/** The panel's sign-in screen: the brand over a card with the form. */
export const LoginPage = ({ next }: LoginPageProps) => {
  const { panelBadge, title, lead } = authContent.login;
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-4 py-8">
      <div className="w-full max-w-[430px] rounded-[26px] border border-line-soft bg-surface p-8 shadow-raised">
        <div className="mb-5 flex items-center gap-3">
          <DaisyMark size={46} />
          <Wordmark />
          <span className="ml-auto rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal-deep">
            {panelBadge}
          </span>
        </div>
        <h1 className="text-[1.75rem] font-semibold">{title}</h1>
        <p className="mt-2 mb-5 text-ink-soft">{lead}</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
};
