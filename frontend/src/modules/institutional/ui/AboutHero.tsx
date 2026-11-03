import Link from "next/link";

import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";
import { ScriptWord } from "@/modules/core/ui/ScriptWord";

import { aboutContent } from "../content/about";
import { InquiryButton } from "./InquiryButton";

const HEADING_ID = "sobre-nosotros-historia";

export const AboutHero = () => {
  const { eyebrow, title, paragraphs, contactCta, productsCta } = aboutContent.hero;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid items-center gap-10 min-[781px]:grid-cols-2 min-[781px]:gap-11"
    >
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id={HEADING_ID} className="mt-2.5 text-display font-semibold">
          {title.lines[0]} <br />
          {title.lines[1]} <ScriptWord>{title.highlight}</ScriptWord>.
        </h1>
        <div className="mt-5 flex flex-col gap-4 leading-[1.7] text-ink-soft">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-[60ch]">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <InquiryButton label={contactCta} variant="whatsapp" />
          <Button asChild variant="outline" className="h-11 px-6">
            <Link href="/productos">{productsCta}</Link>
          </Button>
        </div>
      </div>
      <DaisyMark size={300} className="mx-auto hidden w-full max-w-75 min-[781px]:block" />
    </section>
  );
};
