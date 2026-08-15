import type { Metadata } from "next";
import { OrderCalculator } from "./OrderCalculator";

export const metadata: Metadata = {
  title: "接單雷達｜外送訂單試算",
  description: "用金額、距離、時間與車輛成本，快速判斷外送訂單並追蹤真正淨利。",
};

export default function Home() {
  return <OrderCalculator />;
}
