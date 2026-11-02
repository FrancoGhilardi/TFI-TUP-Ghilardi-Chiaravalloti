import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

import { aboutTeaserContent } from "../content/about-teaser";

const HEADING_ID = "sobre-nosotros-titulo";

export const AboutTeaser = () => {
  const { eyebrow, title, body, cta } = aboutTeaserContent;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid items-center gap-8 overflow-hidden rounded-[26px] bg-linear-120 from-wheat to-wheat-deep p-8 text-center min-[781px]:grid-cols-[1.1fr_0.9fr] min-[781px]:p-12 min-[781px]:text-left"
    >
      <div>
        <Eyebrow className="mb-2.5 justify-center min-[781px]:justify-start">{eyebrow}</Eyebrow>
        <h2 id={HEADING_ID} className="text-section font-semibold">
          {title}
        </h2>
        <p className="mx-auto mt-3.5 max-w-[46ch] text-ink-soft min-[781px]:mx-0">{body}</p>
        <Button asChild className="mt-5">
          <Link href={cta.href}>
            {cta.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <DaisyMark size={220} className="mx-auto max-w-50 min-[781px]:max-w-none" />
    </section>
  );
};
