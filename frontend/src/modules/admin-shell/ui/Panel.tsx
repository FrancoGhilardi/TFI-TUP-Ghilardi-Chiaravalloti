import Link from "next/link";
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  /** A link in the header, such as to the full list. */
  action?: { label: string; href: string };
  children: ReactNode;
}

/** A titled card of the panel's home. */
export const Panel = ({ title, action, children }: PanelProps) => {
  return (
    <section
      aria-label={title}
      className="rounded-card border border-line-soft bg-surface shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
};
