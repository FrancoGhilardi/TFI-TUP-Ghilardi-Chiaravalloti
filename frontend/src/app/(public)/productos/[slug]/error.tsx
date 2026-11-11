"use client";

import { ProductErrorState } from "@/modules/catalog";

interface ProductErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

const ProductError = ({ error, retry }: ProductErrorProps) => {
  return <ProductErrorState retry={retry} digest={error.digest} />;
};

export default ProductError;
