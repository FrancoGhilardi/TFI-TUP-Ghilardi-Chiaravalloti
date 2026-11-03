"use client";

import { ProductErrorState } from "@/modules/catalog";

interface ProductErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ProductError = ({ reset }: ProductErrorProps) => {
  return <ProductErrorState reset={reset} />;
};

export default ProductError;
