interface IllustrationBackdropProps {
  /** Must be unique on the page: two drawings sharing an id would share one gradient. */
  gradientId: string;
}

/** The warm disc with a dotted rim behind the store's illustrations, for a 460-unit drawing. */
export const IllustrationBackdrop = ({ gradientId }: IllustrationBackdropProps) => {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="[stop-color:var(--color-paper)]" />
          <stop offset="1" className="[stop-color:var(--color-wheat-deep)]" />
        </linearGradient>
      </defs>
      <circle cx={230} cy={230} r={205} fill={`url(#${gradientId})`} />
      <circle
        cx={230}
        cy={230}
        r={205}
        className="fill-none stroke-gold"
        strokeWidth={2}
        strokeDasharray="3 9"
        opacity={0.5}
      />
    </>
  );
};
