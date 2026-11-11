import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

interface OutOfRangeStateProps {
  title: string;
  text: string;
  action: string;
  /** The first page of the same list. */
  firstPageHref: string;
}

/** The page asked for is past the last one: the filters may have left fewer pages than before. */
export const OutOfRangeState = ({ title, text, action, firstPageHref }: OutOfRangeStateProps) => {
  return (
    <div className="p-4">
      <StatusMessage
        icon={FileQuestion}
        title={title}
        description={text}
        actions={
          <Button asChild>
            <Link href={firstPageHref}>{action}</Link>
          </Button>
        }
      />
    </div>
  );
};
