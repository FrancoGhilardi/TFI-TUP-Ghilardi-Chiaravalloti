import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

interface ListPageProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** The link that starts a new record. */
  create: { label: string; href: string };
  /** The toolbar and the results of the list. */
  children: ReactNode;
}

/** The frame of a panel list: its heading, the way to create a record and the framed list. */
export const ListPage = ({ eyebrow, title, lead, create, children }: ListPageProps) => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1.5 text-[1.9rem] font-semibold">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-ink-soft">{lead}</p>
        </div>
        <Button asChild>
          <Link href={create.href}>
            <Plus aria-hidden="true" />
            {create.label}
          </Link>
        </Button>
      </header>
      <section
        aria-label={title}
        className="rounded-card border border-line-soft bg-surface shadow-sm"
      >
        {children}
      </section>
    </div>
  );
};
