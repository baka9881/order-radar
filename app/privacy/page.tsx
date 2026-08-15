import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

export const metadata: Metadata = {
  title: "隱私權政策｜接單雷達",
  description: "接單雷達網站與手機 App 的資料處理、定位權限與刪除方式。",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACY"
      title="隱私權政策"
      intro="接單雷達以少收資料為原則。手機 App 的接單紀錄、成本設定與位置比對預設留在裝置上，不靠廣告或跨 App 追蹤營利。"
    >
      <section>
        <h2>手機 App 如何處理資料</h2>
        <ul>
          <li><strong>定位：</strong>用於顯示附近政府公開設備與提供安全提醒。座標在手機本機與離線設備資料比對，不儲存完整行程，也不會加入訂單紀錄。</li>
          <li><strong>背景定位：</strong>只有你主動開啟背景安全提醒後才使用。可隨時在 App 或 iPhone 設定中關閉。</li>
          <li><strong>訂單與設定：</strong>訂單金額、距離、時間及成本設定只儲存在裝置。核心功能不要求建立帳號。</li>
          <li><strong>通知：</strong>只用於你開啟的前方固定設備提醒，不發送廣告通知。</li>
        </ul>
      </section>

      <section>
        <h2>網站版與回饋資料</h2>
        <p>網站版在你允許定位後，會將目前座標送到本站 API，以即時計算附近公開設備；應用程式不會把這些座標寫入訂單資料庫。託管與安全服務仍可能依其必要作業處理短期網路紀錄。</p>
        <p>若你主動登入網站、同步訂單或送出意見，我們可能處理帳號識別資料、Email、訂單紀錄及你填寫的訊息，只用於提供同步、回覆問題與改善產品。</p>
      </section>

      <section>
        <h2>不會做的事</h2>
        <ul>
          <li>不出售個人資料。</li>
          <li>不建立跨 App 或跨網站廣告追蹤。</li>
          <li>不收集通訊錄、照片、麥克風內容或 Uber Eats 畫面。</li>
          <li>不提供或收集流動執法與警力位置回報。</li>
        </ul>
      </section>

      <section>
        <h2>保留、刪除與你的選擇</h2>
        <p>手機資料可由 App「設定 → 清除這台手機上的所有資料」刪除，刪除 App 也會移除其本機資料。網站帳號資料或曾送出的回饋，可透過支援頁提出查詢或刪除要求；法律或資訊安全必須保留的部分除外。</p>
      </section>

      <section>
        <h2>資料來源與兒童隱私</h2>
        <p>固定測速與科技執法位置來自政府公開資料，可能延遲或缺漏。接單雷達不是為兒童設計的服務，也不會刻意蒐集兒童個人資料。</p>
      </section>

      <section>
        <h2>聯絡我們</h2>
        <p>如需詢問隱私、資料副本或刪除要求，請使用本站支援頁的表單，並選擇「資料與帳號」。</p>
      </section>
    </LegalPage>
  );
}
