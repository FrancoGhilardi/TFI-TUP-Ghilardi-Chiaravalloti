import { DaisyBloom } from "@/modules/core/ui/DaisyBloom";

const AWNING_LEFT = 40;
const AWNING_WIDTH = 220;
const AWNING_STRIPES = 7;
const STRIPE_WIDTH = AWNING_WIDTH / AWNING_STRIPES;
const STRIPES = Array.from({ length: AWNING_STRIPES }, (_, index) => ({
  x: AWNING_LEFT + index * STRIPE_WIDTH,
  className: index % 2 === 0 ? "fill-coral" : "fill-paper",
}));

/** Spines on the shop-window shelf, all standing on the same line. */
const SHELF_Y = 224;
const WINDOW_BOOKS = [
  { x: 74, width: 12, height: 32, className: "fill-gold" },
  { x: 88, width: 10, height: 38, className: "fill-teal" },
  { x: 100, width: 14, height: 28, className: "fill-coral" },
  { x: 116, width: 10, height: 34, className: "fill-gold-light" },
  { x: 128, width: 12, height: 42, className: "fill-teal-light" },
] as const;

/** The shop seen from the street: striped awning, a window with books and a potted daisy, the door. Decorative. */
export const StorefrontIllustration = () => {
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true" focusable="false" className="size-full">
      <ellipse cx={150} cy={262} rx={120} ry={7} className="fill-ink" opacity={0.08} />
      <rect x={44} y={84} width={212} height={176} rx={6} className="fill-cream" />

      <rect x={36} y={60} width={228} height={34} rx={8} className="fill-teal" />
      <DaisyBloom transform="translate(137 64) scale(.26)" />
      {STRIPES.map(({ x, className: stripe }) => (
        <path
          key={x}
          d={`M${x} 94 H${x + STRIPE_WIDTH} V118 a${STRIPE_WIDTH / 2} ${STRIPE_WIDTH / 2} 0 0 1 ${-STRIPE_WIDTH} 0 Z`}
          className={stripe}
        />
      ))}

      <rect
        x={62}
        y={146}
        width={104}
        height={80}
        rx={5}
        className="fill-teal-soft stroke-teal-deep"
        strokeWidth={4}
      />
      {WINDOW_BOOKS.map(({ x, width, height, className: cover }) => (
        <rect
          key={x}
          x={x}
          y={SHELF_Y - height}
          width={width}
          height={height}
          rx={2}
          className={cover}
        />
      ))}
      <rect x={64} y={SHELF_Y} width={100} height={4} className="fill-teal-deep" />
      <path d="M153 214 V196" className="stroke-teal" strokeWidth={2.5} />
      <DaisyBloom transform="translate(142 181) scale(.22)" />
      <path d="M146 214 h14 l-2 10 h-10 Z" className="fill-coral" />

      <rect x={186} y={146} width={54} height={114} rx={4} className="fill-teal-deep" />
      <rect x={194} y={156} width={38} height={44} rx={3} className="fill-teal-soft" />
      <circle cx={230} cy={210} r={3} className="fill-gold" />

      <rect x={40} y={258} width={220} height={6} rx={3} className="fill-line-strong" />
    </svg>
  );
};
