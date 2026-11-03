import { Clock, MapPin } from "lucide-react";

import { siteConfig } from "@/modules/core/config/site";
import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { Button } from "@/modules/core/ui/primitives/button";

import { aboutContent } from "../content/about";
import { InquiryButton } from "./InquiryButton";
import { VisitDetail } from "./VisitDetail";

const HEADING_ID = "sobre-nosotros-visita";

export const AboutVisit = () => {
  const { title, text, contactCta, directionsCta, addressLabel, hoursLabel } = aboutContent.visit;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid items-center gap-8 overflow-hidden rounded-[26px] bg-linear-120 from-wheat to-wheat-deep p-8 min-[781px]:grid-cols-[1.1fr_0.9fr] min-[781px]:p-12"
    >
      <div>
        <h2 id={HEADING_ID} className="text-section font-semibold">
          {title}
        </h2>
        <p className="mt-3.5 max-w-[46ch] text-ink-soft">{text}</p>
        <div className="mt-4 flex flex-col gap-2.5 text-[0.95rem] text-ink-soft">
          <VisitDetail icon={MapPin} label={addressLabel}>
            {siteConfig.address}
          </VisitDetail>
          <VisitDetail icon={Clock} label={hoursLabel}>
            <ul>
              {siteConfig.hours.map(({ days, time }) => (
                <li key={days}>
                  {days} · {time}
                </li>
              ))}
            </ul>
          </VisitDetail>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <InquiryButton label={contactCta} />
          <Button asChild variant="outline" className="h-11 px-6">
            <ExternalLink href={siteConfig.mapsUrl}>
              <MapPin aria-hidden="true" />
              {directionsCta}
            </ExternalLink>
          </Button>
        </div>
      </div>
      <DaisyMark size={220} className="mx-auto hidden min-[781px]:block" />
    </section>
  );
};
