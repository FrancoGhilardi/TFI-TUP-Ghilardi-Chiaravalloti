import { CircleAlert } from "lucide-react";

import { Button } from "@/modules/core/ui/primitives/button";

import { homeContent } from "../content/home";

interface BlockErrorProps {
  onRetry: () => void;
}

/** In place of one block of the home that could not load; the rest keeps working. */
export const BlockError = ({ onRetry }: BlockErrorProps) => {
  const { block, retry } = homeContent.error;
  return (
    <div role="alert" className="flex flex-col items-start gap-3 text-sm text-ink">
      <p className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral-strong" aria-hidden="true" />
        {block}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {retry}
      </Button>
    </div>
  );
};
