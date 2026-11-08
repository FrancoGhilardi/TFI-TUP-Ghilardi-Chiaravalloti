import type { AuthenticatedUser } from "@/modules/auth";
import { Breadcrumb } from "@/modules/core/ui/Breadcrumb";

import { shellContent } from "../content/shell";
import { pageTitle } from "../domain/menu";
import { MobileSidebar } from "./MobileSidebar";

interface TopbarProps {
  user: AuthenticatedUser;
  pathname: string;
}

export const Topbar = ({ user, pathname }: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 lg:px-7">
        <MobileSidebar user={user} pathname={pathname} />
        <Breadcrumb label={shellContent.breadcrumbLabel} items={[{ label: pageTitle(pathname) }]} />
      </div>
    </header>
  );
};
