import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraSiklus — Kebun sehat, musim demi musim",
  description:
    "Rencanakan rotasi tanaman, catat riwayat kebun, dan pantau kesehatan tanah dengan TerraSiklus.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
