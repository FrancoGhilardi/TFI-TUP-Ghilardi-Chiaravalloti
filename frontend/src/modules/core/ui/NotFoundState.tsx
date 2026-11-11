import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

interface NotFoundStateProps {
  title: string;
  text: string;
  action: string;
  /** Where the way back leads. */
  href: string;
  icon?: LucideIcon;
}

/** What is asked for does not exist: it may have been deleted, or the address may be wrong. */
export const NotFoundState = ({
  title,
  text,
  action,
  href,
  icon = SearchX,
}: NotFoundStateProps) => {
  return (
    <StatusMessage
      icon={icon}
      title={title}
      description={text}
      actions={
        <Button asChild>
          <Link href={href}>{action}</Link>
        </Button>
      }
    />
  );
};
