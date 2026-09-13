import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katolicka Liga Siatkówki",
  description: "Tabele, mecze, drużyny, zgłoszenia i dokumenty Katolickiej Ligi Siatkówki.",
  icons: { icon: "/assets/logo-kls.jpg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
