import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { panelGateDestination } from "../domain/panel-gate";
import { refreshSession } from "./refresh-session";
import { useSessionStore } from "./session-store";

type GateView = "ready" | "loading" | "unavailable";

/**
 * Restores the session when the panel opens (it only lives in memory) and sends the person where
 * they have to be first. Tells what to show: the screen, a wait, or that the session could not be
 * looked up (with a way to try again).
 */
export function usePanelGate(): { view: GateView; retry: () => void } {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const retry = useSessionStore((state) => state.retry);
  const destination = panelGateDestination({ status, user, pathname, search });

  useEffect(() => {
    if (status === "loading") {
      void refreshSession();
    }
  }, [status]);

  useEffect(() => {
    if (destination) {
      router.replace(destination);
    }
  }, [destination, router]);

  if (status === "unavailable") {
    return { view: "unavailable", retry };
  }
  return { view: status === "authenticated" && destination === null ? "ready" : "loading", retry };
}
