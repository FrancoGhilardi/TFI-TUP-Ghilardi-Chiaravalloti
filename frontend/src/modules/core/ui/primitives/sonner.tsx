"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/** Where the messages that confirm or refuse an action appear; styled with the design tokens. */
export const Toaster = (props: ToasterProps) => {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-line-soft)",
          "--success-bg": "var(--color-teal-soft)",
          "--success-text": "var(--color-teal-deep)",
          "--success-border": "var(--color-teal-soft)",
          "--error-bg": "var(--color-coral-soft)",
          "--error-text": "var(--color-ink)",
          "--error-border": "var(--color-coral-soft)",
        } as CSSProperties
      }
      {...props}
    />
  );
};
