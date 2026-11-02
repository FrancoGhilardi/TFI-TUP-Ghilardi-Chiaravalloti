import { cn } from "@/modules/core/lib/utils";

const PETAL_COUNT = 11;
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, index) => (index * 360) / PETAL_COUNT);

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
      <g transform="translate(0 -4)">
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={angle}
            cx={50}
            cy={27}
            rx={6.6}
            ry={13}
            transform={`rotate(${angle} 50 50)`}
            className="fill-white stroke-line"
            strokeWidth={1}
          />
        ))}
        <circle cx={50} cy={50} r={11} className="fill-gold" />
        <circle cx={50} cy={50} r={6} className="fill-gold-deep" />
      </g>
    </svg>
  );
};
