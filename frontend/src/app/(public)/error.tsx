"use client";

import { StoreErrorPage } from "@/modules/site-layout";

interface StoreErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

const StoreError = ({ error, retry }: StoreErrorProps) => {
  return <StoreErrorPage retry={retry} digest={error.digest} />;
};

export default StoreError;
