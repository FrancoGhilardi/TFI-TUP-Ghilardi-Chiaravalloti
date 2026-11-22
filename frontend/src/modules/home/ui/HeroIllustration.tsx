import { DaisyBloom } from "@/modules/core/ui/DaisyBloom";
import { IllustrationBackdrop } from "@/modules/core/ui/IllustrationBackdrop";

const GRADIENT_ID = "hero-illustration-background";

/** Spines of the stack, bottom to top, each a little narrower and shifted so it reads as hand-stacked. */
const BOOKS = [
  { x: 126, y: 322, width: 208, height: 34, cover: "fill-teal", band: "fill-teal-light" },
  { x: 134, y: 290, width: 186, height: 32, cover: "fill-coral", band: "fill-coral-light" },
  { x: 142, y: 262, width: 182, height: 28, cover: "fill-gold", band: "fill-gold-light" },
] as const;

const BAND_INSET = 16;
const BAND_WIDTH = 5;

/** Outline of the open book's pages; `drop` and `spread` draw the layers peeking out beneath them. */
const openBookPath = (drop = 0, spread = 0) => {
  const y = (value: number) => value + drop;
  return [
    `M230 ${y(196)}`,
    `C208 ${y(182)} 178 ${y(178)} ${146 - spread} ${y(186)}`,
    `V${y(254)}`,
    `C178 ${y(246)} 208 ${y(250)} 230 ${y(258)}`,
    `C252 ${y(250)} 282 ${y(246)} ${314 + spread} ${y(254)}`,
    `V${y(186)}`,
    `C282 ${y(178)} 252 ${y(182)} 230 ${y(196)}`,
    "Z",
  ].join(" ");
};

/** Lines of text bending with the pages, the last one of each page shorter. */
const TEXT_LINES =
  "M164 196 C182 194 200 198 216 204 M244 204 C260 198 278 194 296 196 " +
  "M164 207 C182 205 200 209 216 215 M244 215 C260 209 278 205 296 207 " +
  "M164 218 C182 216 200 220 216 226 M244 226 C260 220 278 216 296 218 " +
  "M164 229 C176 228 188 229 198 232 M244 237 C252 233 262 231 274 230";

/** A stack of books with an open one on top and the store's daisy growing from its fold. Decorative. */
export const HeroIllustration = () => {
  return (
    <svg viewBox="0 0 460 460" aria-hidden="true" focusable="false" className="size-full">
      <IllustrationBackdrop gradientId={GRADIENT_ID} />

      <ellipse cx={230} cy={358} rx={118} ry={8} className="fill-ink" opacity={0.08} />
      {BOOKS.map(({ x, y, width, height, cover, band }) => (
        <g key={y}>
          <rect x={x} y={y} width={width} height={height} rx={5} className={cover} />
          <rect x={x + BAND_INSET} y={y} width={BAND_WIDTH} height={height} className={band} />
          <rect
            x={x + width - BAND_INSET - BAND_WIDTH}
            y={y}
            width={BAND_WIDTH}
            height={height}
            className={band}
          />
        </g>
      ))}

      <path
        d="M230 214 C230 176 252 148 288 126"
        className="fill-none stroke-teal"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <path
        d="M242 172 C256 156 276 156 286 162 C272 174 256 178 242 172 Z"
        className="fill-teal-light"
      />
      <DaisyBloom transform="translate(249 73) scale(.9)" />

      <g strokeWidth={2} strokeLinejoin="round">
        <path d={openBookPath(5, 4)} className="fill-teal stroke-teal" />
        <path d={openBookPath(3, 2)} className="fill-paper stroke-line" />
        <path d={openBookPath()} className="fill-white stroke-line" />
      </g>
      <path d="M230 196 V258" className="stroke-line" strokeWidth={2} />
      <path
        d={TEXT_LINES}
        className="fill-none stroke-line-strong"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <circle cx={122} cy={150} r={5} className="fill-gold-light" />
      <circle cx={104} cy={178} r={2.5} className="fill-coral-light" />
      <circle cx={356} cy={246} r={3.5} className="fill-gold" />
    </svg>
  );
};
