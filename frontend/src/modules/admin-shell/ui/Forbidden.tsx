import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { ADMIN_PATHS } from "@/modules/auth";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { shellContent } from "../content/shell";

/** In place of a section the signed-in role may not open. */
export const Forbidden = () => {
  const { title, description, action } = shellContent.forbidden;
  return (
    <StatusMessage
      icon={ShieldAlert}
      title={title}
      description={description}
      actions={
        <Button asChild>
          <Link href={ADMIN_PATHS.products}>{action}</Link>
        </Button>
      }
    />
  );
};
