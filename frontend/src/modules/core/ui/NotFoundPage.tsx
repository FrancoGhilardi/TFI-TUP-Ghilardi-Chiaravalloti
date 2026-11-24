import { SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { systemPagesContent } from "@/modules/core/content/system-pages";
import { PageState } from "@/modules/core/ui/PageState";
import { Button } from "@/modules/core/ui/primitives/button";

interface NotFoundPageProps {
  homeHref: string;
  homeLabel: string;
  /** More ways out, such as a link to the catalog. */
  children?: ReactNode;
}

/**
 * What an address that leads nowhere shows. It is only mounted by `not-found` files, and Next
 * already adds `noindex` to every not-found render, so it adds no robots tag of its own.
 */
export const NotFoundPage = ({ homeHref, homeLabel, children }: NotFoundPageProps) => {
  const { notFound } = systemPagesContent;
  return (
    <PageState
      icon={SearchX}
      title={notFound.title}
      description={notFound.body}
      actions={
        <>
          <Button asChild>
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
          {children}
        </>
      }
    />
  );
};
