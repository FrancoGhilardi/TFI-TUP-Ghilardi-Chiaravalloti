"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { systemPagesContent } from "@/modules/core/content/system-pages";
import { PageState } from "@/modules/core/ui/PageState";
import { Button } from "@/modules/core/ui/primitives/button";

interface ErrorPageProps {
  /** Reads and renders the page again, as Next gives it to an error boundary. */
  retry: () => void;
  /** The identifier Next gives to the failure, to match it with the server's logs. */
  digest?: string;
  homeHref: string;
  homeLabel: string;
  /** More ways out, such as a contact link. */
  children?: ReactNode;
}

/** What a page that failed to render shows. Nothing of the original error reaches the screen. */
export const ErrorPage = ({ retry, digest, homeHref, homeLabel, children }: ErrorPageProps) => {
  const { error } = systemPagesContent;
  return (
    <PageState
      noIndex
      role="alert"
      icon={CloudOff}
      title={error.title}
      description={error.body}
      reference={digest}
      actions={
        <>
          <Button type="button" onClick={retry}>
            {error.retry}
          </Button>
          <Button asChild variant="outline">
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
          {children}
        </>
      }
    />
  );
};
