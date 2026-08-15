import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";
import { SupportForm } from "./SupportForm";

export const metadata: Metadata = {
  title: "支援中心｜接單雷達",
  description: "接單雷達 App 的定位、提醒、資料與帳號支援。",
};

export default function SupportPage() {
  return (
    <LegalPage eyebrow="SUPPORT" title="支援中心" intro="遇到定位、通知、試算或資料問題，可以先依下方方式排查，或直接送出問題。">
      <section>
        <h2>背景提醒沒有作用</h2>
        <ol>
          <li>確認已安裝 TestFlight／EAS 開發版；Expo Go 不支援背景定位。</li>
          <li>前往 iPhone「設定 → 接單雷達 → 定位」，允許背景使用定位。</li>
          <li>確認通知與聲音已允許，並在 App 內主動開啟背景提醒。</li>
          <li>完全強制關閉 App 後，iOS 可能停止持續定位；重新開啟並啟用即可。</li>
        </ol>
      </section>
      <section>
        <h2>設備或速限資料不正確</h2>
        <p>App 只整理政府已公開且有可用座標的固定設備，不包含流動執法。資料可能有更新延遲，請以現場標誌、號誌與速限為準。回報時請附上縣市、道路與行車方向。</p>
      </section>
      <section>
        <h2>刪除資料</h2>
        <p>手機本機資料可在「設定 → 清除這台手機上的所有資料」刪除。匿名資料計畫可在設定中退出，App 會使用本機保存的刪除憑證移除過去貢獻；離線時會保留憑證供稍後重試。網站同步資料或回饋紀錄可用下方表單提出要求。</p>
      </section>
      <section>
        <h2>聯絡支援</h2>
        <SupportForm />
      </section>
    </LegalPage>
  );
}
