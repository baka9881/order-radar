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
        <a className="landing-mobile-download" href="#expo-test">測試版</a>
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

      <section className="app-features why-section" id="app-features">
        <div className="why-heading">
          <h2>為什麼要使用</h2>
          <p>把外送員接單前最需要知道的資訊，整理成幾秒就能看懂的答案。</p>
        </div>
        <div className="why-grid">
          <article><span aria-hidden="true">✓</span><h3>秒懂這張單</h3><p>輸入金額、公里與時間，直接顯示接、看或拒。</p></article>
          <article><span aria-hidden="true">✓</span><h3>回程一起計算</h3><p>把續跑、回熱區或空車返程的成本一起算進去。</p></article>
          <article><span aria-hidden="true">✓</span><h3>看懂真正收益</h3><p>同時查看完整淨時薪、淨利與每公里收益。</p></article>
          <article><span aria-hidden="true">✓</span><h3>導航不中斷</h3><p>跑單途中保留定位、導航與下一步行程資訊。</p></article>
          <article><span aria-hidden="true">✓</span><h3>安全設備提醒</h3><p>顯示公開固定測速與科技執法設備，降低漏看風險。</p></article>
          <article><span aria-hidden="true">✓</span><h3>紀錄接單表現</h3><p>收工後回顧訂單品質，慢慢找出適合自己的門檻。</p></article>
        </div>
      </section>

      <section className="backup-calculator" id="calculator">
        <div className="backup-heading simple-section-heading">
          <div><h2>先算一張單</h2><p>免安裝，填入四個數字就能看到結果。</p></div>
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

      <section className="expo-test" id="expo-test">
        <div className="simple-section-heading"><h2>如何開始測試</h2><p>目前先使用 Expo Go 體驗主要功能。</p></div>
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
