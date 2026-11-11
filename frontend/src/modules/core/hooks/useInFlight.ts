import { useRef, useState } from "react";

/**
 * Keeps track of what is being done to each item of a list. While one thing is on its way for an
 * item, asking for another for the same item does nothing; other items are not affected.
 */
export function useInFlight() {
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const run = async (id: string, task: () => Promise<void>) => {
    if (inFlight.current.has(id)) {
      return;
    }
    inFlight.current.add(id);
    setPending(new Set(inFlight.current));
    try {
      await task();
    } finally {
      inFlight.current.delete(id);
      setPending(new Set(inFlight.current));
    }
  };

  return { run, isPending: (id: string) => pending.has(id) };
}
