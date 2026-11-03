import type { Metadata } from "next";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { fontVariables } from "@/modules/core/ui/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Librería Mi Sueño",
  description: "Catálogo online con reserva por WhatsApp",
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
