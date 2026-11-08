"use client";

import { ChangePasswordSection, useSessionUser } from "@/modules/auth";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";

import { accountContent } from "../content/account";
import { AccountCard } from "./AccountCard";
import { Panel } from "./Panel";

/** The person's own data and the way to change their password. */
export const AccountPage = () => {
  const user = useSessionUser();
  if (!user) {
    return null;
  }
  const { eyebrow, title, lead, password } = accountContent;
  return (
    <div className="flex flex-col gap-6">
      <header>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 text-[1.9rem] font-semibold">{title}</h1>
        <p className="mt-1 text-ink-soft">{lead}</p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.2fr]">
        <AccountCard user={user} />
        <Panel title={password.title}>
          <ChangePasswordSection />
          <p className="mt-4 text-sm text-ink-soft">{password.note}</p>
        </Panel>
      </div>
    </div>
  );
};
