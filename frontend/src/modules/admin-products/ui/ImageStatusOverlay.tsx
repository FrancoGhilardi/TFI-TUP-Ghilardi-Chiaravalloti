import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/modules/core/ui/primitives/button";

import { savedImagesText } from "../content/product-form";
import type { ImageStatus } from "../domain/admin-product";

interface ImageStatusProps {
  status: ImageStatus;
  /** Retrying is on its way, or something else is asked of the image. */
  busy: boolean;
  onRetry: () => void;
}

/** What state a saved image is in: processing, ready, or failed with a way to try again. */
export const ImageStatusOverlay = ({ status, busy, onRetry }: ImageStatusProps) => {
  const { status: labels, retry } = savedImagesText;

  if (status === "PROCESSED") {
    return (
      <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-xs font-semibold text-teal-deep">
        {labels.PROCESSED}
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-deep"
      >
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        {labels.PENDING}
      </span>
    );
  }
  return (
    <span role="alert" className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-2.5 py-0.5 text-xs font-semibold text-coral-strong">
        <TriangleAlert className="size-3" aria-hidden="true" />
        {labels.FAILED}
      </span>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onRetry}>
        {retry}
      </Button>
    </span>
  );
};
