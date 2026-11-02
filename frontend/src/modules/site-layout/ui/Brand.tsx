import Link from "next/link";

import { DaisyMark } from "@/modules/core/ui/DaisyMark";
import { Wordmark } from "@/modules/core/ui/Wordmark";

import { HOME } from "../domain/navigation";

export const Brand = () => {
  return (
    <Link href={HOME.href} className="mr-auto flex items-center gap-2.5 rounded-lg">
      <DaisyMark size={42} />
      <Wordmark />
    </Link>
  );
};
