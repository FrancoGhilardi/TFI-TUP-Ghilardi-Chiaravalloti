import type { ReactNode } from "react";

import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Wordmark } from "@/modules/core/ui/Wordmark";

import { authContent } from "../content/auth";

interface AuthCardProps {
  title: string;
  lead: string;
  children: ReactNode;
}

/** The frame of the panel's auth screens: the brand over a card with a title and the form. */
export const AuthCard = ({ title, lead, children }: AuthCardProps) => {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-4 py-8">
      <div className="w-full max-w-[430px] rounded-[26px] border border-line-soft bg-surface p-8 shadow-raised">
        <div className="mb-5 flex items-center gap-3">
          <DaisyMark size={46} />
          <Wordmark />
          <span className="ml-auto rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal-deep">
            {authContent.login.panelBadge}
          </span>
        </div>
        <h1 className="text-[1.75rem] font-semibold">{title}</h1>
        <p className="mt-2 mb-5 text-ink-soft">{lead}</p>
        {children}
      </div>
    </main>
  );
};
