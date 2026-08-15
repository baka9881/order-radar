import type { Metadata } from "next";
import { OrderCalculator } from "./OrderCalculator";

export const metadata: Metadata = {
  title: "接單雷達｜外送訂單試算與安全導航",
  description: "用金額、距離、時間與車輛成本判斷訂單，並查看沿途公開固定測速與科技執法設備。",
};

export default function Home() {
  return <OrderCalculator />;
}
