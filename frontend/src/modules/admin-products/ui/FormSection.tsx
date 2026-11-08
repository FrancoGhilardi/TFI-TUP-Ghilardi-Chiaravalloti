import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  /** Short help at the end of the heading, such as "2 de 5". */
  note?: string;
  children: ReactNode;
}

/** A titled card of the product form. */
export const FormSection = ({ title, note, children }: FormSectionProps) => {
  return (
    <section
      aria-label={title}
      className="rounded-card border border-line-soft bg-surface shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <span className="text-sm text-ink-soft">{note}</span>}
      </header>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
};
