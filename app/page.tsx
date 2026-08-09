import type { Metadata } from "next";
import { OrderCalculator } from "./OrderCalculator";

export const metadata: Metadata = {
  title: "接單雷達｜外送訂單試算",
  description: "用金額、距離與時間，快速判斷 Uber Eats 訂單值不值得接。",
};

export default function Home() {
  return <OrderCalculator />;
}
