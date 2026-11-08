"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { canOpenPanelPath, useSessionUser } from "@/modules/auth";
import { Toaster } from "@/modules/core/ui/primitives/sonner";
import { SkipLink } from "@/modules/core/ui/SkipLink";

import { shellContent } from "../content/shell";
import { Forbidden } from "./Forbidden";
import { SidebarContent } from "./SidebarContent";
import { Topbar } from "./Topbar";

interface PanelShellProps {
  children: ReactNode;
}

/**
 * The frame of the panel: sidebar, top bar and the screen. Someone who must change a temporary
 * password gets no frame, only that screen; a role that may not open the section gets a notice
 * in its place.
 */
export const PanelShell = ({ children }: PanelShellProps) => {
  const user = useSessionUser();
  const pathname = usePathname();

  if (!user) {
    return null;
  }
  if (user.mustChangePassword) {
    return children;
  }
  return (
    <>
      {/* Outside the grid: its live region is an element of its own and would take a cell. */}
      <Toaster />
      <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[278px_1fr]">
        <SkipLink targetId={shellContent.contentId} />
        <aside className="sticky top-0 hidden h-dvh lg:block">
          <SidebarContent user={user} pathname={pathname} />
        </aside>
        <div className="flex min-w-0 flex-col">
          <Topbar user={user} pathname={pathname} />
          <main
            id={shellContent.contentId}
            tabIndex={-1}
            className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 pb-20 outline-none lg:px-7"
          >
            {canOpenPanelPath(user.role, pathname) ? children : <Forbidden />}
          </main>
        </div>
      </div>
    </>
  );
};
