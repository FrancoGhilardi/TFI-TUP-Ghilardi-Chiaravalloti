import { cn } from "@/modules/core/lib/utils";

import { DaisyBloom } from "./DaisyBloom";

interface DaisyMarkProps {
  size?: number;
  className?: string;
}

/** The store's daisy, drawn as the "i" of "Mi". Decorative: the brand name always sits beside it. */
export const DaisyMark = ({ size = 40, className }: DaisyMarkProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path
        d="M30 92 V54 a13 13 0 0 1 26 0 V70 a7 7 0 0 1-14 0 V60"
        className="fill-none stroke-gold"
        strokeWidth={6.5}
        strokeLinecap="round"
      />
      <DaisyBloom transform="translate(0 -4)" />
    </svg>
  );
};
