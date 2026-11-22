const PETAL_COUNT = 11;
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, index) => (index * 360) / PETAL_COUNT);

interface DaisyBloomProps {
  /** Moves and scales the flower; it is drawn centered on (50, 50) in a 100-unit box. */
  transform?: string;
}

/** The flower head of the store's daisy, as an SVG group to place inside a larger drawing. */
export const DaisyBloom = ({ transform }: DaisyBloomProps) => {
  return (
    <g transform={transform}>
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
  );
};
