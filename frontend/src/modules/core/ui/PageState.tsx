import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { systemPagesContent } from "@/modules/core/content/system-pages";
import { Container } from "@/modules/core/ui/Container";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";

interface PageStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ways out, such as links or buttons. */
  actions?: ReactNode;
  /** `alert` for failures, so assistive technology announces them. */
  role?: "status" | "alert";
  /** What lets someone match the failure with the server's logs. */
  reference?: string;
  /** Asks search engines to leave the page out. */
  noIndex?: boolean;
}

/** A whole page made of a message: a missing address or a failure. Its message is the `h1`. */
export const PageState = ({
  icon,
  title,
  description,
  actions,
  role,
  reference,
  noIndex,
}: PageStateProps) => {
  return (
    <Container className="py-16">
      {noIndex && <meta name="robots" content="noindex" />}
      <StatusMessage
        headingLevel="h1"
        icon={icon}
        title={title}
        description={description}
        actions={actions}
        role={role}
      />
      {reference && (
        <p className="mt-4 text-center text-xs text-ink-soft">
          {systemPagesContent.reference(reference)}
        </p>
      )}
    </Container>
  );
};
