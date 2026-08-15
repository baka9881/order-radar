import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
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
  description: "台灣外送員的接單判斷、真實淨利、安全導航與公開執法設備提醒工具。",
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
    title: "接單雷達｜接單更精準，行車更安心",
    description: "算清楚每張單的真實淨利，並查看沿途公開的固定測速與科技執法設備。",
    siteName: "接單雷達",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "/og-navigation.png",
        width: 1731,
        height: 909,
        alt: "接單雷達，接單更精準，行車更安心",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "接單雷達｜接單更精準，行車更安心",
    description: "台灣外送員的接單判斷、淨利分析與安全導航工具。",
    images: ["/og-navigation.png"],
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
