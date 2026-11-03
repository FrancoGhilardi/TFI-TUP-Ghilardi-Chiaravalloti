import type { LucideIcon } from "lucide-react";

interface VisitDetailProps {
  icon: LucideIcon;
  /** Read by assistive technology only; the icon says it to everyone else. */
  label: string;
  children: string;
}

/** A line of practical information, such as where the store is or when it is open. */
export const VisitDetail = ({ icon: Icon, label, children }: VisitDetailProps) => {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4.5 shrink-0 text-teal" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      {children}
    </div>
  );
};
