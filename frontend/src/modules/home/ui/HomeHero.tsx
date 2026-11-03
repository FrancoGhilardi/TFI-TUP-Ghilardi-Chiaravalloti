import { siteConfig } from "@/modules/core/config/site";
import { Container } from "@/modules/core/ui/Container";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { ScriptWord } from "@/modules/core/ui/ScriptWord";

import { heroContent } from "../content/hero";
import { HeroActions } from "./HeroActions";
import { HeroIllustration } from "./HeroIllustration";
import { HeroSearch } from "./HeroSearch";

export const HomeHero = () => {
  const { eyebrow, title, lead } = heroContent;
  return (
    <section className="overflow-hidden border-b border-line-soft bg-hero">
      <Container className="grid items-center gap-2 py-10 text-center nav:grid-cols-[1.05fr_0.95fr] nav:gap-10 nav:py-16 nav:text-left">
        <div>
          <Eyebrow className="justify-center nav:justify-start">{eyebrow}</Eyebrow>
          <h1 className="mt-3.5 text-display font-semibold tracking-[-0.02em]">
            {title.lines[0]} <br />
            {title.lines[1]} <ScriptWord>{title.highlight}</ScriptWord>.
          </h1>
          <p className="mx-auto mt-4.5 max-w-[34ch] text-lg text-ink-soft nav:mx-0">{lead}</p>
          <HeroSearch />
          <HeroActions />
        </div>
        <div className="row-start-1 mx-auto flex w-full max-w-70 flex-col items-center gap-1 nav:col-start-2 nav:ml-auto nav:max-w-115">
          <div className="aspect-square w-full">
            <HeroIllustration />
          </div>
          {/* The brand's line, signed under the illustration so it does not compete with the heading. */}
          <p className="font-script text-3xl text-coral-strong nav:text-4xl">
            {siteConfig.tagline}
          </p>
        </div>
      </Container>
    </section>
  );
};
