import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "./Eyebrow";

interface SectionHeadingProps {
  /** Id for the section's `aria-labelledby`. */
  id: string;
  eyebrow: ReactNode;
  title: string;
  /** "Ver todo" link; `label` is its full accessible name, such as "Ver todos los destacados". */
  more?: { href: string; label: string };
}

/** Small label, section title and an optional "Ver todo" link aligned to the right. */
export const SectionHeading = ({ id, eyebrow, title, more }: SectionHeadingProps) => {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
        <h2 id={id} className="text-section font-semibold">
          {title}
        </h2>
      </div>
      {more && (
        <Link
          href={more.href}
          aria-label={more.label}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm text-[0.95rem] font-semibold whitespace-nowrap text-teal hover:underline"
        >
          Ver todo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
};
