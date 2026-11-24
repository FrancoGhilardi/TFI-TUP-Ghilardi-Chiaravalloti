import { DaisyBloom } from "@/modules/core/ui/DaisyBloom";
import { IllustrationBackdrop } from "@/modules/core/ui/IllustrationBackdrop";

const GRADIENT_ID = "about-illustration-background";

const PENCIL_WIDTH = 16;
const TIP_LENGTH = 24;
const LEAD_LENGTH = 8;

/** Pencils standing in the cup: where the body leaves the cup, its tilt and how much of it shows. */
const PENCILS = [
  { x: 206, y: 300, angle: -14, length: 150, body: "fill-gold", stripe: "fill-gold-light" },
  { x: 232, y: 300, angle: -2, length: 172, body: "fill-coral", stripe: "fill-coral-light" },
] as const;

/** A pencil cup with the store's daisy among the pencils and a notebook leaning on it. Decorative. */
export const AboutIllustration = () => {
  const half = PENCIL_WIDTH / 2;
  const leadHalf = (half * LEAD_LENGTH) / TIP_LENGTH;
  return (
    <svg viewBox="0 0 460 460" aria-hidden="true" focusable="false" className="size-full">
      <IllustrationBackdrop gradientId={GRADIENT_ID} />
      <ellipse cx={236} cy={366} rx={120} ry={8} className="fill-ink" opacity={0.08} />

      {PENCILS.map(({ x, y, angle, length, body, stripe }) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <rect x={-half} y={-length} width={PENCIL_WIDTH} height={length} className={body} />
          <rect x={-2.5} y={-length} width={5} height={length} className={stripe} />
          <path
            d={`M${-half} ${-length} H${half} L0 ${-length - TIP_LENGTH} Z`}
            className="fill-wheat-deep"
          />
          <path
            d={`M${-leadHalf} ${-length - TIP_LENGTH + LEAD_LENGTH} H${leadHalf} L0 ${-length - TIP_LENGTH} Z`}
            className="fill-ink"
          />
        </g>
      ))}

      <path
        d="M256 300 C256 236 274 186 306 150"
        className="fill-none stroke-teal"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <path
        d="M264 222 C276 204 298 202 310 208 C296 222 278 228 264 222 Z"
        className="fill-teal-light"
      />
      <DaisyBloom transform="translate(267 95) scale(.9)" />

      <path d="M176 244 H296 L288 360 a8 8 0 0 1-8 7 H192 a8 8 0 0 1-8-7 Z" className="fill-teal" />
      <rect x={170} y={234} width={132} height={16} rx={6} className="fill-teal-deep" />
      <path d="M180 292 H292 L291 304 H181 Z" className="fill-teal-light" />

      <g transform="rotate(10 118 366)">
        <rect x={118} y={266} width={66} height={100} rx={5} className="fill-coral" />
        <rect x={118} y={266} width={10} height={100} rx={3} className="fill-coral-light" />
        <rect x={140} y={290} width={32} height={18} rx={3} className="fill-paper" />
      </g>

      <circle cx={128} cy={158} r={5} className="fill-gold-light" />
      <circle cx={110} cy={186} r={2.5} className="fill-coral-light" />
      <circle cx={360} cy={262} r={3.5} className="fill-gold" />
    </svg>
  );
};
