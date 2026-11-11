import type { Metadata } from "next";
import { ProductLanding } from "./ProductLanding";

export const metadata: Metadata = {
  title: "接單雷達｜手機外送判單工具",
  description: "手機 App 是主產品；網站提供產品資訊、測試說明與免安裝備用試算。",
};

export default function Home() {
  return <ProductLanding />;
}
