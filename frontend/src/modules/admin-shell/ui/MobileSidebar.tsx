"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import type { AuthenticatedUser } from "@/modules/auth";
import { useOnMediaQueryMatch } from "@/modules/core/hooks/useOnMediaQueryMatch";
import { Button } from "@/modules/core/ui/primitives/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/modules/core/ui/primitives/sheet";

import { shellContent } from "../content/shell";
import { FIXED_SIDEBAR_MEDIA_QUERY } from "../domain/layout";
import { SidebarContent } from "./SidebarContent";

interface MobileSidebarProps {
  user: AuthenticatedUser;
  pathname: string;
}

/** The sidebar on screens too narrow to keep it fixed: a button that opens it over the page. */
export const MobileSidebar = ({ user, pathname }: MobileSidebarProps) => {
  // Remembers where it was opened: on any other screen it counts as closed (back, a redirect).
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  // From this width the button is hidden, so an open menu would have no way to close.
  useOnMediaQueryMatch(FIXED_SIDEBAR_MEDIA_QUERY, () => setOpenedAt(null));

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenedAt(next ? pathname : null)}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={shellContent.openMenu}
          className="lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 border-0 bg-ink p-0 data-[side=left]:w-[278px] data-[side=left]:max-w-[85vw]"
      >
        <SheetTitle className="sr-only">{shellContent.menuTitle}</SheetTitle>
        <SidebarContent user={user} pathname={pathname} onNavigate={() => setOpenedAt(null)} />
      </SheetContent>
    </Sheet>
  );
};
