"use client";

import type { ReactNode } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import { usePanelGate } from "../application/usePanelGate";
import { authContent } from "../content/auth";

interface PanelGateProps {
  children: ReactNode;
}

/** Shows a panel screen only once there is a session and nothing is pending before it. */
export const PanelGate = ({ children }: PanelGateProps) => {
  const { view, retry } = usePanelGate();
  const { loading, unavailable, retry: retryLabel } = authContent.gate;

  if (view === "ready") {
    return children;
  }
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center text-ink-soft">
      {view === "unavailable" ? (
        <div role="alert" className="flex flex-col items-center gap-4">
          <p>{unavailable}</p>
          <Button type="button" onClick={retry}>
            {retryLabel}
          </Button>
        </div>
      ) : (
        <p role="status">{loading}</p>
      )}
    </main>
  );
};
