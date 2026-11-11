import { formatDate } from "@/modules/core/formatters/date-time";
import { ArchivedNotice } from "@/modules/core/ui/ArchivedNotice";

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
    <ArchivedNotice
      message={deleted.notice(formatDate(product.deletedAt))}
      actionLabel={deleted.restore}
      pending={isPending(product.id)}
      onAction={() => void restore(product.id)}
    />
  );
};
