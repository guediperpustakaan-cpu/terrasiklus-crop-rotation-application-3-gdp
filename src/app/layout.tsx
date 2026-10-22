import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TrakteerWidget } from "@/components/trakteer-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraSiklus — Kebun sehat, musim demi musim",
  description:
    "Rencanakan rotasi tanaman, catat riwayat kebun, dan pantau kesehatan tanah dengan TerraSiklus.",
  applicationName: "TerraSiklus",
  authors: [{ name: "MZF" }],
  keywords: ["kebun", "rotasi tanaman", "uji tanah", "Next.js", "Drizzle ORM", "Neon"],
  openGraph: {
    title: "TerraSiklus — Kebun sehat, musim demi musim",
    description:
      "Rencanakan rotasi tanaman, catat riwayat kebun, dan pantau kesehatan tanah dengan TerraSiklus.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <TrakteerWidget />
      </body>
    </html>
  );
}

