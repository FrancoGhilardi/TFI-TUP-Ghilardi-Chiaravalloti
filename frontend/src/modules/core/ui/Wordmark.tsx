import { cn } from "@/modules/core/lib/utils";

const TONES = {
  onLight: { top: "text-teal", bottom: "text-ink" },
  onDark: { top: "text-gold", bottom: "text-white" },
} as const;

const SIZES = {
  md: "text-[1.7rem]",
  lg: "text-[1.9rem]",
} as const;

interface WordmarkProps {
  /** Background it sits on. */
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
}

/** The store name as set in the brand: small spaced capitals over the script "Mi Sueño". */
export const Wordmark = ({ tone = "onLight", size = "md" }: WordmarkProps) => {
  const colors = TONES[tone];
  return (
    <span className="flex flex-col leading-none">
      <span className={cn("text-[0.66rem] font-bold tracking-[0.34em] uppercase", colors.top)}>
        Librería
      </span>
      <span className={cn("-mt-px font-script", SIZES[size], colors.bottom)}>Mi Sueño</span>
    </span>
  );
};
