import { CloudOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/modules/core/ui/primitives/button";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";

import { catalogContent } from "../content/catalog";

interface CatalogErrorStateProps {
  /** The same catalog URL, to load it again. */
  retryHref: string;
}

export const CatalogErrorState = ({ retryHref }: CatalogErrorStateProps) => {
  const { error } = catalogContent;
  return (
    <StatusMessage
      role="alert"
      icon={CloudOff}
      title={error.title}
      description={error.body}
      actions={
        <Button asChild>
          <Link href={retryHref}>{error.retry}</Link>
        </Button>
      }
    />
  );
};
