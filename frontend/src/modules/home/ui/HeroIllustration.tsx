import { DaisyMark } from "@/modules/core/ui/DaisyMark";

const GRADIENT_ID = "hero-illustration-background";

/** Stacked books with an open one on top and the store's daisy. Decorative. */
export const HeroIllustration = () => {
  return (
    <svg viewBox="0 0 460 460" aria-hidden="true" focusable="false" className="size-full">
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="[stop-color:var(--color-paper)]" />
          <stop offset="1" className="[stop-color:var(--color-wheat-deep)]" />
        </linearGradient>
      </defs>
      <circle cx={230} cy={230} r={205} fill={`url(#${GRADIENT_ID})`} />
      <circle
        cx={230}
        cy={230}
        r={205}
        className="fill-none stroke-gold"
        strokeWidth={2}
        strokeDasharray="3 9"
        opacity={0.5}
      />
      <g transform="rotate(-8 230 300)">
        <rect x={120} y={300} width={220} height={34} rx={6} className="fill-teal" />
        <rect x={120} y={300} width={220} height={10} rx={5} className="fill-teal-light" />
      </g>
      <g transform="rotate(5 230 270)">
        <rect x={135} y={266} width={200} height={32} rx={6} className="fill-coral" />
        <rect x={135} y={266} width={200} height={9} rx={5} className="fill-coral-light" />
      </g>
      <g transform="rotate(-3 230 236)">
        <rect x={128} y={232} width={210} height={32} rx={6} className="fill-gold" />
        <rect x={128} y={232} width={210} height={9} rx={5} className="fill-gold-light" />
      </g>
      <g transform="translate(0 -6)">
        <path
          d="M150 210 q80-30 80 6 q0-36 80-6 v-92 q-80-30-80 6 q0-36-80-6 Z"
          className="fill-white stroke-line"
          strokeWidth={2}
        />
        <path d="M230 124 v92" className="stroke-line" strokeWidth={2} />
        <path
          d="M168 138 h44M168 152 h40M250 138 h44M250 152 h40"
          className="stroke-line-strong"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(300 70) scale(.9)">
        <DaisyMark size={86} />
      </g>
      <g className="fill-gold">
        <path d="M96 120c.5 4 1.4 4.9 5.4 5.4-4 .5-4.9 1.4-5.4 5.4-.5-4-1.4-4.9-5.4-5.4 4-.5 4.9-1.4 5.4-5.4Z" />
        <path d="M372 250c.4 3.2 1.1 3.9 4.3 4.3-3.2.4-3.9 1.1-4.3 4.3-.4-3.2-1.1-3.9-4.3-4.3 3.2-.4 3.9-1.1 4.3-4.3Z" />
      </g>
    </svg>
  );
};
