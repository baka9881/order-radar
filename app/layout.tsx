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
  description: "台灣外送員的接單判斷、真實淨利與營運分析工具。",
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
    title: "接單雷達｜真實淨利，一眼看懂",
    description: "把金額、距離、時間與車輛成本算清楚，判斷每張單值不值得接。",
    siteName: "接單雷達",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1728,
        height: 909,
        alt: "接單雷達，真實淨利一眼看懂",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "接單雷達｜真實淨利，一眼看懂",
    description: "台灣外送員的接單判斷與淨利分析工具。",
    images: ["/og.png"],
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
