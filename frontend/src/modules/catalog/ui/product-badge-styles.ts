import { cva } from "class-variance-authority";

export const badgeStyles = cva(
  "inline-flex rounded-full px-2.5 py-1 text-[0.66rem] font-bold tracking-[0.04em] uppercase",
  {
    variants: {
      kind: {
        featured: "bg-gold text-ink",
        new: "bg-teal text-white",
        sale: "bg-coral-strong text-white",
      },
    },
  },
);
