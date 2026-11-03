import { Container } from "@/modules/core/ui/Container";

import { AboutHero } from "./AboutHero";
import { AboutValues } from "./AboutValues";
import { AboutVisit } from "./AboutVisit";

/** The store's story, what it stands for and how to find it. Static: it reads no data. */
export const AboutPage = () => {
  return (
    <Container className="flex flex-col gap-12 py-10 min-[781px]:py-14">
      <AboutHero />
      <AboutValues />
      <AboutVisit />
    </Container>
  );
};
