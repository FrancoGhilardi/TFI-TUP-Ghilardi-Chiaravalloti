import type { Metadata } from "next";

import { fontVariables } from "@/modules/core/ui/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Librería Mi Sueño",
  description: "Catálogo online con reserva por WhatsApp",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="es" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
};

export default RootLayout;
