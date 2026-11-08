import { Archive } from "lucide-react";

import { formatDate } from "@/modules/core/formatters/date-time";
import { Button } from "@/modules/core/ui/primitives/button";

import { useProductActions } from "../application/useProductActions";
import { productFormText } from "../content/product-form";
import type { AdminProductDetail } from "../domain/admin-product";

interface DeletedNoticeProps {
  product: AdminProductDetail & { deletedAt: Date };
}

/** Why a deleted product cannot be edited, and the way to bring it back. */
export const DeletedNotice = ({ product }: DeletedNoticeProps) => {
  const { restore, isPending } = useProductActions();
  const { deleted } = productFormText;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-sm text-ink"
    >
      <Archive className="size-4 shrink-0 text-coral-strong" aria-hidden="true" />
      <p className="flex-1">{deleted.notice(formatDate(product.deletedAt))}</p>
      <Button
        type="button"
        size="sm"
        disabled={isPending(product.id)}
        onClick={() => void restore(product.id)}
      >
        {deleted.restore}
      </Button>
    </div>
  );
};
