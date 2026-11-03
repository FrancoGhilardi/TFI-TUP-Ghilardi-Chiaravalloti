import { Heart, type LucideIcon, Printer, Truck } from "lucide-react";

import { aboutContent } from "../content/about";
import { ValueCard } from "./ValueCard";

const HEADING_ID = "sobre-nosotros-valores";

type ValueId = (typeof aboutContent.values.items)[number]["id"];

const VALUE_ICONS: Record<ValueId, LucideIcon> = {
  closeness: Heart,
  services: Printer,
  pickup: Truck,
};

export const AboutValues = () => {
  const { heading, items } = aboutContent.values;
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className="sr-only">
        {heading}
      </h2>
      <ul className="grid gap-4.5 min-[681px]:grid-cols-3">
        {items.map(({ id, title, text }) => (
          <li key={id}>
            <ValueCard icon={VALUE_ICONS[id]} title={title} text={text} />
          </li>
        ))}
      </ul>
    </section>
  );
};
