import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { BreadcrumbItem } from "@/modules/core/lib/breadcrumb";

interface BreadcrumbProps {
  /** Accessible name of the navigation, such as "Migas de pan". */
  label: string;
  items: BreadcrumbItem[];
}

/** The path to the current page; its last item is the page itself and has no link. */
export const Breadcrumb = ({ label, items }: BreadcrumbProps) => {
  return (
    <nav aria-label={label} className="text-sm text-ink-soft">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map(({ label: text, href }, index) => (
          <li key={href ?? "current"} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            {href ? (
              <Link href={href} className="rounded-sm hover:text-ink hover:underline">
                {text}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {text}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
