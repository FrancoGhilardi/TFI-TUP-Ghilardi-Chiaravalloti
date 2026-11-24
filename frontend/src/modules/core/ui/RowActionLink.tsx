import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { ROW_ACTION_CLASS, ROW_ACTION_ICON_CLASS } from "./row-action-styles";

interface RowActionLinkProps {
  icon: LucideIcon;
  /** Names the action for assistive technology and for the hover title. */
  label: string;
  href: string;
}

/** An icon link in a list row, such as the one that opens the record. */
export const RowActionLink = ({ icon: Icon, label, href }: RowActionLinkProps) => {
  return (
    <Link href={href} aria-label={label} title={label} className={ROW_ACTION_CLASS}>
      <Icon className={ROW_ACTION_ICON_CLASS} aria-hidden="true" />
    </Link>
  );
};
