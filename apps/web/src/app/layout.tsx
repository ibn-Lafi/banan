import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "بنان — نظام الفوترة",
  description: "نظام إدارة مبيعات وفوترة للمناديب",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#18181b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="overflow-x-hidden bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
