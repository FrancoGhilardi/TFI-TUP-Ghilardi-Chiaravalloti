import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface VisitDetailProps {
  icon: LucideIcon;
  /** Read by assistive technology only; the icon says it to everyone else. */
  label: string;
  children: ReactNode;
}

/** A line of practical information, such as where the store is or when it is open. */
export const VisitDetail = ({ icon: Icon, label, children }: VisitDetailProps) => {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-teal" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <div>{children}</div>
    </div>
  );
};
