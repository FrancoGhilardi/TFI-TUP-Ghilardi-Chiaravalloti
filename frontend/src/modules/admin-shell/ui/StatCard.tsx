import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/modules/core/lib/utils";
import { Button } from "@/modules/core/ui/primitives/button";

import { homeContent } from "../content/home";

const TONES = {
  teal: "bg-teal-soft text-teal-deep",
  wheat: "bg-wheat text-ink-soft",
  coral: "bg-coral-soft text-coral-strong",
  gold: "bg-gold-soft text-gold-deep",
} as const;

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  /** Where the card leads. */
  href: string;
  /** The number, once it is there. */
  value: number | undefined;
  isError: boolean;
  onRetry: () => void;
}

const BOX = "flex flex-col gap-3 rounded-card border border-line-soft bg-surface p-5 shadow-sm";

/** One number of the home. If it cannot load, only this card says so and offers to try again. */
export const StatCard = ({
  label,
  icon: Icon,
  tone,
  href,
  value,
  isError,
  onRetry,
}: StatCardProps) => {
  const icon = (
    <span className={cn("grid size-10 place-items-center rounded-xl", TONES[tone])}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );

  // A refresh that fails keeps the number that was already there; only a missing one is an error.
  if (isError && value === undefined) {
    return (
      <div role="alert" className={BOX}>
        {icon}
        <p className="text-sm text-ink-soft">
          {label}: {homeContent.stats.failed}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="self-start">
          {homeContent.error.retry}
        </Button>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        BOX,
        "outline-none hover:border-line focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {icon}
      <span aria-busy={value === undefined} className="text-3xl font-semibold tabular-nums">
        {value ?? "…"}
      </span>
      <span className="text-sm text-ink-soft">{label}</span>
    </Link>
  );
};
