"use client";

import { systemPagesContent } from "@/modules/core/content/system-pages";
import { ErrorPage } from "@/modules/core/ui/ErrorPage";
import { fontVariables } from "@/modules/core/ui/fonts";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

// Replaces the root layout when it fails, so it brings its own document, styles and fonts.
const GlobalError = ({ error, retry }: GlobalErrorProps) => {
  return (
    <html lang="es" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <title>{systemPagesContent.error.title}</title>
        <main className="flex flex-1 flex-col justify-center">
          <ErrorPage
            retry={retry}
            digest={error.digest}
            homeHref="/"
            homeLabel={systemPagesContent.home}
          />
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
