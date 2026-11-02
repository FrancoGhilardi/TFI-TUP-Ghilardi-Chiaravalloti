import type { IconProps } from "./icon-props";

/** Decorative: the control that holds it carries the accessible name. */
export const InstagramIcon = (props: IconProps) => {
  return (
    <svg
      viewBox="0 0 19 19"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
      width={19}
      height={19}
      {...props}
    >
      <rect x={2.5} y={2.5} width={14} height={14} rx={4.5} />
      <circle cx={9.5} cy={9.5} r={3.4} />
      <circle cx={13.6} cy={5.4} r={1} fill="currentColor" stroke="none" />
    </svg>
  );
};
