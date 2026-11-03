import type { LucideIcon } from "lucide-react";

interface ValueCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** One thing the store stands for: an icon, a short title and a sentence. */
export const ValueCard = ({ icon: Icon, title, text }: ValueCardProps) => {
  return (
    <div className="rounded-card border border-line-soft bg-surface p-6">
      <Icon className="mb-2.5 size-8.5 text-teal" aria-hidden="true" />
      <h3 className="mb-1.5 text-[1.1rem] font-semibold">{title}</h3>
      <p className="text-[0.92rem] text-ink-soft">{text}</p>
    </div>
  );
};
