import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Macias Plans Room",
  description: "Secure TxDOT Plans Portal for Macias Specialty Contracting",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Macias Plans Room",
    description: "Secure TxDOT Plans Portal for Macias Specialty Contracting",
    images: ["/favicon.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f36f21",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
