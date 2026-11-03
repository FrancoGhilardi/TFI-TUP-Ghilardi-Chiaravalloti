"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

// The public API caches its answers for 60 s, so asking again sooner brings nothing new.
const STALE_TIME_MS = 60_000;

interface QueryProviderProps {
  children: ReactNode;
}

/** Cache for the reads the browser makes; the visitor retries by hand, so nothing retries alone. */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false, retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
