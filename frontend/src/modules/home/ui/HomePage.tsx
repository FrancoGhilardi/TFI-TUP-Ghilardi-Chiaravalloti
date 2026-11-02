import { Container } from "@/modules/core/ui/Container";
import { AboutTeaser } from "@/modules/institutional";

import { CategoriesSection } from "./CategoriesSection";
import { FeaturedSection } from "./FeaturedSection";
import { HomeHero } from "./HomeHero";
import { NewArrivalsSection } from "./NewArrivalsSection";
import { ServicesStrip } from "./ServicesStrip";

export const HomePage = () => {
  return (
    <>
      <HomeHero />
      <ServicesStrip />
      <Container className="flex flex-col gap-16 py-16">
        <FeaturedSection />
        <CategoriesSection />
        <NewArrivalsSection />
        <AboutTeaser />
      </Container>
    </>
  );
};
