import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/modules/core/ui/primitives/button";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";

import { catalogContent } from "../content/catalog";

interface PageOutOfRangeProps {
  /** First page with the same filters. */
  firstPageHref: string;
}

/** A page number beyond the last one, typically from an old link after products changed. */
export const PageOutOfRange = ({ firstPageHref }: PageOutOfRangeProps) => {
  const { outOfRange } = catalogContent;
  return (
    <StatusMessage
      icon={FileQuestion}
      title={outOfRange.title}
      actions={
        <Button asChild>
          <Link href={firstPageHref}>{outOfRange.toFirst}</Link>
        </Button>
      }
    />
  );
};
