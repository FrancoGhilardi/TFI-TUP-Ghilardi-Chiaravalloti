import { cva } from "class-variance-authority";

/** Pill shared by the header links and the "Productos" trigger, teal when it is the current section. */
export const navItemStyles = cva(
  "inline-flex h-10 items-center rounded-full px-3.5 text-[0.95rem] font-semibold transition-colors hover:bg-wheat hover:text-ink",
  {
    variants: {
      active: {
        true: "text-teal",
        false: "text-ink-soft",
      },
    },
    defaultVariants: { active: false },
  },
);
