"use client";

import { usePathname } from "next/navigation";

import { isActivePath } from "../domain/navigation";

/** Whether `href` is the section of the current page. */
export function useIsActivePath(href: string): boolean {
  return isActivePath(usePathname(), href);
}
