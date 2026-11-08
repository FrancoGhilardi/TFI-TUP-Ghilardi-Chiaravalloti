import { CircleAlert } from "lucide-react";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { productFormText } from "../content/product-form";

interface ProductLoadErrorProps {
  onRetry: () => void;
}

export const ProductLoadError = ({ onRetry }: ProductLoadErrorProps) => {
  const { title, text, retry } = productFormText.loadError;
  return (
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
  );
};
