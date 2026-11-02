"use client";

import { useEffect, useEffectEvent } from "react";

/** Calls `onMatch` each time the viewport starts matching `query`, such as when it widens. */
export function useOnMediaQueryMatch(query: string, onMatch: () => void): void {
  const handleMatch = useEffectEvent(onMatch);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      if (event.matches) {
        handleMatch();
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
}
