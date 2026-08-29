"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateOrder,
  formatNumber,
  RETURN_MODES,
  STATUS,
  type ReturnMode,
} from "../shared/order-engine";

const RETURN_MODE_KEYS = Object.keys(RETURN_MODES) as ReturnMode[];

export function ProductLanding() {
  const [amount, setAmount] = useState(795);
  const [distance, setDistance] = useState(29.8);
  const [minutes, setMinutes] = useState(63);
  const [extraWait, setExtraWait] = useState(0);
  const [returnMode, setReturnMode] = useState<ReturnMode>("full");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      const nextAmount = Number(query.get("amount"));
      const nextDistance = Number(query.get("distance") ?? query.get("km"));
      const nextMinutes = Number(query.get("minutes") ?? query.get("time"));
      const nextReturnMode = query.get("returnMode");
      if (nextAmount > 0) setAmount(nextAmount);
      if (nextDistance > 0) setDistance(nextDistance);
      if (nextMinutes > 0) setMinutes(nextMinutes);
      if (nextReturnMode && nextReturnMode in RETURN_MODES) setReturnMode(nextReturnMode as ReturnMode);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const result = useMemo(
    () => calculateOrder({ amount, distance, minutes, extraWait, returnMode }),
    [amount, distance, minutes, extraWait, returnMode],
  );
  const status = STATUS[result.signal];
  const shortfall = Math.max(0, Math.ceil(result.greenMinimum - amount));

  return (
    <main className="landing-shell">
      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-label="接單雷達首頁">
          <span>接</span>
          <div><strong>接單雷達</strong><small>外送夥伴的行動判單工具</small></div>
        </a>
        <nav aria-label="主要導覽">
          <a href="#app-features">功能</a>
          <a href="#calculator">備用試算</a>
          <a className="landing-download-link" href="#expo-test">測試版</a>
        </nav>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <span className="landing-kicker landing-kicker-pill">✦ 為外送員打造的行動判單 App</span>
          <h1><span>跑單不靠猜，</span><em>每張單先看懂。</em></h1>
          <p>輸入金額、公里、預估時間與回程情境，幾秒內判斷值得接、要觀察，還是先拒絕。</p>
          <div className="landing-actions">
            <a className="landing-primary" href="#expo-test"><span aria-hidden="true">●</span> iPhone 測試版</a>
            <a className="landing-secondary" href="#expo-test"><span aria-hidden="true">▶</span> Android 測試版</a>
          </div>
          <small className="landing-trust"><i aria-hidden="true">✓</i> Expo Go 封閉測試中 · 測試 QR 持續有效</small>
          <small className="landing-honesty">網頁不會在背景讀取 Uber Eats；即時通知與行車功能由手機 App 負責。</small>
        </div>

        <div className={`app-preview signal-${result.signal}`} aria-label="手機 App 判單畫面預覽">
          <div className="phone-statusbar"><strong>9:41</strong><span>接單雷達</span><b>● ●</b></div>
          <div className="phone-map" aria-hidden="true">
            <span className="phone-map-pill">導航與執法提醒</span>
            <i className="phone-road phone-road-a" />
            <i className="phone-road phone-road-b" />
            <i className="phone-road phone-road-c" />
            <i className="phone-route" />
            <b className="phone-marker phone-marker-speed">測</b>
            <b className="phone-marker phone-marker-tech">科</b>
            <b className="phone-marker phone-marker-shop">取</b>
            <span className="phone-position" />
            <small className="phone-place phone-place-a">板橋</small>
            <small className="phone-place phone-place-b">新莊</small>
            <small className="phone-place phone-place-c">中和</small>
          </div>
          <div className="phone-decision-card">
            <div className="phone-order-row">
              <div><small>訂單金額</small><strong>${formatNumber(amount)}</strong></div>
              <span>{status.action}</span>
            </div>
            <div className="phone-metrics">
              <span>淨時薪 <b>${formatNumber(result.fullHourly)}</b></span>
              <span>每公里 <b>${formatNumber(result.perKm, 1)}</b></span>
            </div>
            <p>{status.label} · {RETURN_MODES[returnMode].label} · {formatNumber(result.effectiveDistance, 1)} km</p>
          </div>
          <div className="app-preview-tabs"><span>導航</span><b>判單</b><span>紀錄</span></div>
        </div>
      </section>

      <section className="product-role" aria-label="產品分工">
        <article><span>01</span><strong>手機 App</strong><p>實際跑單使用：即時判單、定位、導航與公開執法設備提醒。</p></article>
        <article><span>02</span><strong>這個網站</strong><p>產品入口、條款客服，以及手機臨時不方便時的備用試算。</p></article>
        <article><span>03</span><strong>同一套公式</strong><p>網站與 App 共用成本、回程與紅黃綠門檻，不再各算各的。</p></article>
      </section>

      <section className="backup-calculator" id="calculator">
        <div className="backup-heading">
          <div><span className="landing-kicker">免安裝備用工具</span><h2>快速試算這張訂單</h2></div>
          <p>出門跑單仍建議使用手機 App；這裡適合桌面規劃或臨時查算。</p>
        </div>
        <div className="backup-layout">
          <div className="backup-form">
            <div className="backup-fields">
              <label><span>訂單金額</span><div><i>$</i><input inputMode="decimal" min="0" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><b>元</b></div></label>
              <label><span>訂單距離</span><div><input inputMode="decimal" min="0" step="0.1" type="number" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /><b>km</b></div></label>
              <label><span>預估時間</span><div><input inputMode="numeric" min="1" type="number" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /><b>分鐘</b></div></label>
              <label><span>額外等待</span><div><input inputMode="numeric" min="0" type="number" value={extraWait} onChange={(event) => setExtraWait(Number(event.target.value))} /><b>分鐘</b></div></label>
            </div>
            <fieldset className="return-mode-fieldset">
              <legend>送達後怎麼跑？</legend>
              {RETURN_MODE_KEYS.map((mode) => (
                <button className={returnMode === mode ? "active" : ""} key={mode} onClick={() => setReturnMode(mode)} type="button">
                  <strong>{RETURN_MODES[mode].label}</strong><span>{RETURN_MODES[mode].description}</span>
                </button>
              ))}
            </fieldset>
          </div>
          <aside className={`backup-result signal-${result.signal}`}>
            <span className="backup-result-label">判斷結果</span>
            <div className="backup-verdict"><i /><strong>{status.label}</strong></div>
            <p>{result.signal === "green" ? "已達綠燈門檻。" : result.signal === "yellow" ? `再多 ${shortfall} 元可到綠燈。` : `至少 ${Math.ceil(result.yellowMinimum)} 元才進入黃燈。`}</p>
            <dl>
              <div><dt>完整淨時薪</dt><dd>${formatNumber(result.fullHourly)}</dd></div>
              <div><dt>完整淨利</dt><dd>${formatNumber(result.fullNet)}</dd></div>
              <div><dt>每公里</dt><dd>${formatNumber(result.perKm, 1)}</dd></div>
              <div><dt>計入行程</dt><dd>{formatNumber(result.effectiveDistance, 1)} km / {formatNumber(result.effectiveMinutes)} 分</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="app-features" id="app-features">
        <div><span className="landing-kicker">只放在手機 App</span><h2>真正跑單時需要的功能</h2></div>
        <div className="feature-grid">
          <article><span>即時</span><h3>訂單出現就判斷</h3><p>辨識金額、距離與時間，直接顯示接、看或拒。</p></article>
          <article><span>途中</span><h3>導航與安全提醒</h3><p>前景定位、語音提示，以及公開固定測速與科技執法資料。</p></article>
          <article><span>收工</span><h3>本機訂單紀錄</h3><p>回顧淨時薪與接單品質，匿名資料計畫維持可選擇。</p></article>
        </div>
      </section>

      <section className="expo-test" id="expo-test">
        <div><span className="landing-kicker">目前階段</span><h2>Expo Go 封閉測試中</h2></div>
        <ol>
          <li><span>1</span><p><strong>安裝 Expo Go</strong>目前用來確認 iPhone 介面、試算、地圖與前景定位。</p></li>
          <li><span>2</span><p><strong>使用測試 QR</strong>受邀測試者沿用原本 QR，不必每次更換。</p></li>
          <li><span>3</span><p><strong>重新載入更新</strong>若仍是舊畫面，完整關閉 Expo Go 後再開啟。</p></li>
        </ol>
        <p className="expo-limit">Android 浮窗與背景監看屬於原生功能，需要獨立 APK；Expo Go 無法完整測試。</p>
      </section>

      <footer className="landing-footer">
        <div><strong>接單雷達</strong><span>目前為測試工具，不保證平台顯示金額、交通時間或公開設備資料永遠完整。</span></div>
        <nav><a href="/privacy">隱私權</a><a href="/terms">使用條款</a><a href="/support">客服與回報</a></nav>
      </footer>
    </main>
  );
}
