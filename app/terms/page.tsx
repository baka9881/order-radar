import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

export const metadata: Metadata = {
  title: "使用條款｜接單雷達",
  description: "接單雷達網站與手機 App 的使用、安全與資料準確性條款。",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="TERMS"
      title="使用條款"
      intro="接單雷達是協助外送員估算成本與安全查看公開設備的工具，不代替個人判斷、現場交通標誌或正式導航服務。"
    >
      <section>
        <h2>服務內容</h2>
        <p>本服務提供訂單收益估算、裝置內紀錄、政府公開固定執法設備地圖及外部地圖導航連結。所有結果均為估算，不保證實際收入、成本、路線、行程時間或設備資料完全正確。</p>
      </section>
      <section>
        <h2>安全使用</h2>
        <ul>
          <li>騎乘時應將手機牢固安裝於車架，停妥後再輸入或調整資料。</li>
          <li>永遠以現場速限、標誌、號誌與執法人員指示為準。</li>
          <li>本服務不是緊急救援、車輛自動控制或規避執法工具。</li>
        </ul>
      </section>
      <section>
        <h2>公開資料與服務可用性</h2>
        <p>執法設備資料由政府機關發布，可能因更新時間、格式或座標品質而缺漏。網路、GPS、作業系統省電機制或使用者權限設定，也可能使提醒延遲或停止。</p>
      </section>
      <section>
        <h2>帳號、內容與終止</h2>
        <p>核心手機功能不需帳號。若使用網站同步或回饋功能，你應提供正確資料，不得以服務傳送違法、侵權或破壞系統的內容。我們得在必要時限制濫用行為。</p>
      </section>
      <section>
        <h2>條款變更</h2>
        <p>功能、法律或資料處理方式重大改變時，會更新本頁日期並於適當位置通知。繼續使用更新後的服務，代表你接受最新條款。</p>
      </section>
    </LegalPage>
  );
}
