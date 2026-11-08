import { formatDate, formatDateTime } from "@/modules/core/formatters/date-time";

import { productFormText } from "../content/product-form";
import type { AdminProductDetail } from "../domain/admin-product";
import { FormSection } from "./FormSection";

interface RecordPanelProps {
  product: AdminProductDetail;
}

const Line = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <dt className="text-ink-soft">{label}</dt>
    <dd className="text-right font-semibold">{children}</dd>
  </div>
);

/** What the system keeps about the product: its SKU and who created and last changed it. */
export const RecordPanel = ({ product }: RecordPanelProps) => {
  const { title, sku, created, edited, nobody } = productFormText.record;
  return (
    <FormSection title={title}>
      <dl className="flex flex-col gap-3">
        <Line label={sku}>
          <span className="font-mono">{product.sku}</span>
        </Line>
        <Line label={created}>
          {formatDate(product.createdAt)} · {product.createdBy?.name ?? nobody}
        </Line>
        <Line label={edited}>
          {formatDateTime(product.updatedAt)} · {product.updatedBy?.name ?? nobody}
        </Line>
      </dl>
    </FormSection>
  );
};
