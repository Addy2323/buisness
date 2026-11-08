import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEZLON Business Card Studio | HEZLON Building Solutions",
  description:
    "Dedicated Single-Company Business Card Design Studio, Permanent Digital QR Profile & Print Production System for HEZLON Building Solutions — Aluminum & Glass Specialist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}

