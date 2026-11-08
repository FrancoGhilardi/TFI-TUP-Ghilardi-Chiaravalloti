import { CircleAlert } from "lucide-react";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { productsContent } from "../content/products";

interface ProductsErrorStateProps {
  onRetry: () => void;
}

export const ProductsErrorState = ({ onRetry }: ProductsErrorStateProps) => {
  const { title, text, retry } = productsContent.error;
  return (
    <div className="p-4">
      <StatusMessage
        icon={CircleAlert}
        role="alert"
        title={title}
        description={text}
        actions={
          <Button type="button" variant="outline" onClick={onRetry}>
            {retry}
          </Button>
        }
      />
    </div>
  );
};
