import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatusMessageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ways out, such as links or buttons. */
  actions?: ReactNode;
  /** `alert` for failures, so assistive technology announces them. */
  role?: "status" | "alert";
  /** `h1` when the message is the whole page; inside a page it is a section's heading. */
  headingLevel?: "h1" | "h2";
}

/** A centered message in place of content: no results, a failure, a missing page. */
export const StatusMessage = ({
  icon: Icon,
  title,
  description,
  actions,
  role = "status",
  headingLevel: Heading = "h2",
}: StatusMessageProps) => {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-3 rounded-card border border-line-soft bg-surface px-6 py-12 text-center"
    >
      <Icon className="size-10 text-teal" aria-hidden="true" />
      <Heading className="text-2xl font-semibold">{title}</Heading>
      {description && <p className="max-w-[46ch] text-ink-soft">{description}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
};
