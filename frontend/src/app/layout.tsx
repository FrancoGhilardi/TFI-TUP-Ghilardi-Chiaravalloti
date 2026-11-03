import type { Metadata } from "next";

import { publicConfig } from "@/modules/core/config/env";
import { siteConfig } from "@/modules/core/config/site";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { OPEN_GRAPH_LOCALE } from "@/modules/core/seo/page-metadata";
import { fontVariables } from "@/modules/core/ui/fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicConfig.siteOrigin),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { type: "website", siteName: siteConfig.name, locale: OPEN_GRAPH_LOCALE },
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="es" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
