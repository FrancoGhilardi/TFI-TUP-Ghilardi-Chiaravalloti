"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { SheetClose } from "@/modules/core/ui/primitives/sheet";

interface MobileMenuRowProps extends Omit<ComponentProps<typeof Link>, "href"> {
  label: string;
  href: string;
}

/** Closes the menu when followed, so the page underneath is visible after navigating. */
export const MobileMenuRow = ({ label, href, ...props }: MobileMenuRowProps) => {
  return (
    <SheetClose asChild>
      <Link href={href} {...props}>
        {label}
      </Link>
    </SheetClose>
  );
};
