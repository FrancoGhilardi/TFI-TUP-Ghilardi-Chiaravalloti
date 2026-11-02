import { BookOpen, type LucideIcon, Printer, Receipt, Truck } from "lucide-react";

import { siteConfig } from "@/modules/core/config/site";
import { Container } from "@/modules/core/ui/Container";

type ServiceId = (typeof siteConfig.services)[number]["id"];

const SERVICE_ICONS: Record<ServiceId, LucideIcon> = {
  printing: Printer,
  binding: BookOpen,
  rapipago: Receipt,
};

/** The store's services plus the reservation flow, which the strip also advertises. */
const STRIP_ITEMS: { label: string; Icon: LucideIcon }[] = [
  ...siteConfig.services.map(({ id, label }) => ({ label, Icon: SERVICE_ICONS[id] })),
  { label: "Reservá y retirá en el local", Icon: Truck },
];

export const ServicesStrip = () => {
  return (
    <section aria-label="Servicios" className="bg-ink text-footer-text">
      <Container>
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-2 py-4 text-[0.92rem] font-medium">
          {STRIP_ITEMS.map(({ label, Icon }) => (
            <li key={label} className="inline-flex items-center gap-2">
              <Icon className="size-4.5 text-gold" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
