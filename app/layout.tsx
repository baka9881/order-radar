import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://order-radar-tw.baka0406.chatgpt.site"),
  title: "接單雷達",
  description: "以手機 App 為核心的外送訂單判斷工具；網站提供測試說明與免安裝備用試算。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "接單雷達",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "接單雷達｜接單前先算清楚",
    description: "手機外送判單 App：計入成本、時間與回程情境，快速判斷訂單。",
    siteName: "接單雷達",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "/og-mobile-app.png",
        width: 1536,
        height: 909,
        alt: "接單雷達，接單前先算清楚",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "接單雷達｜接單更精準，行車更安心",
    description: "手機外送判單 App，網站提供測試說明與備用試算。",
    images: ["/og-mobile-app.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07110d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
