"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = "green" | "yellow" | "red";

type CalculatorSettings = {
  fuelPrice: number;
  fuelEconomy: number;
  cashCostPerKm: number;
  fullCostPerKm: number;
  greenHourly: number;
  yellowHourly: number;
  greenPerKm: number;
  yellowPerKm: number;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  amount: number;
  distance: number;
  minutes: number;
  extraWait: number;
  returnRisk: boolean;
  signal: Signal;
  fullHourly: number;
  perKm: number;
};

const DEFAULT_SETTINGS: CalculatorSettings = {
  fuelPrice: 30.5,
  fuelEconomy: 44.8,
  cashCostPerKm: 1.6,
  fullCostPerKm: 3,
  greenHourly: 250,
  yellowHourly: 200,
  greenPerKm: 15,
  yellowPerKm: 12,
};

const STATUS: Record<Signal, { label: string; short: string }> = {
  green: { label: "值得接", short: "接" },
  yellow: { label: "看情況", short: "看" },
  red: { label: "先不要", short: "拒" },
};

const numberFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 1,
});

function roundUp(value: number) {
  return Math.ceil(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function OrderCalculator() {
  const [amount, setAmount] = useState(132);
  const [distance, setDistance] = useState(8.4);
  const [minutes, setMinutes] = useState(35);
  const [extraWait, setExtraWait] = useState(0);
  const [returnRisk, setReturnRisk] = useState(false);
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rawText, setRawText] = useState("");
  const [parseMessage, setParseMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = window.localStorage.getItem("order-radar-settings");
      const savedHistory = window.localStorage.getItem("order-radar-history");
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const query = new URLSearchParams(window.location.search);
      const queryAmount = Number(query.get("amount"));
      const queryDistance = Number(query.get("distance") ?? query.get("km"));
      const queryMinutes = Number(query.get("minutes") ?? query.get("time"));
      if (queryAmount > 0) setAmount(queryAmount);
      if (queryDistance > 0) setDistance(queryDistance);
      if (queryMinutes > 0) setMinutes(queryMinutes);
    } catch {
      // Keep defaults when local browser data is unavailable.
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("order-radar-settings", JSON.stringify(settings));
  }, [hydrated, settings]);

  const result = useMemo(() => {
    const effectiveDistance = Math.max(distance, 0) * (returnRisk ? 1.3 : 1);
    const effectiveMinutes = Math.max(minutes + extraWait, 1);
    const fuelPerKm = settings.fuelPrice / Math.max(settings.fuelEconomy, 1);
    const fuelCost = effectiveDistance * fuelPerKm;
    const cashNet = amount - effectiveDistance * settings.cashCostPerKm;
    const fullNet = amount - effectiveDistance * settings.fullCostPerKm;
    const cashHourly = (cashNet * 60) / effectiveMinutes;
    const fullHourly = (fullNet * 60) / effectiveMinutes;
    const perKm = effectiveDistance > 0 ? amount / effectiveDistance : 0;
    const greenMinimum = Math.max(
      45,
      effectiveDistance * settings.greenPerKm,
      effectiveDistance * settings.fullCostPerKm +
        (settings.greenHourly * effectiveMinutes) / 60,
    );
    const yellowMinimum = Math.max(
      45,
      effectiveDistance * settings.yellowPerKm,
      effectiveDistance * settings.fullCostPerKm +
        (settings.yellowHourly * effectiveMinutes) / 60,
    );

    let signal: Signal = "red";
    if (amount >= greenMinimum) signal = "green";
    else if (amount >= yellowMinimum) signal = "yellow";

    return {
      signal,
      effectiveDistance,
      effectiveMinutes,
      fuelPerKm,
      fuelCost,
      cashNet,
      fullNet,
      cashHourly,
      fullHourly,
      perKm,
      greenMinimum,
      yellowMinimum,
    };
  }, [amount, distance, minutes, extraWait, returnRisk, settings]);

  const parseOfferText = (input: string) => {
    const amountMatch = input.match(/(?:NT\s*)?\$\s*([\d,]+(?:\.\d+)?)/i);
    const timeMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:分鐘|min)/i);
    const distanceMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:公里|km)/i);

    if (!amountMatch || !timeMatch || !distanceMatch) {
      setParseMessage("找不到完整的金額、分鐘與公里，請保留這三項文字。");
      return;
    }

    setAmount(Number(amountMatch[1].replaceAll(",", "")));
    setMinutes(Number(timeMatch[1]));
    setDistance(Number(distanceMatch[1]));
    setParseMessage("已填入，請確認數字後再判斷。");
  };

  const readClipboard = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setRawText(value);
      parseOfferText(value);
    } catch {
      setParseMessage("無法讀取剪貼簿，請長按貼到文字框。");
    }
  };

  const saveResult = () => {
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      amount,
      distance,
      minutes,
      extraWait,
      returnRisk,
      signal: result.signal,
      fullHourly: result.fullHourly,
      perKm: result.perKm,
    };
    const next = [item, ...history].slice(0, 20);
    setHistory(next);
    window.localStorage.setItem("order-radar-history", JSON.stringify(next));
    setHistoryOpen(true);
  };

  const removeHistoryItem = (id: string) => {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    window.localStorage.setItem("order-radar-history", JSON.stringify(next));
  };

  const updateSetting = (key: keyof CalculatorSettings, value: number) => {
    setSettings((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  };

  const shortfall = Math.max(0, roundUp(result.greenMinimum - amount));
  const resultMessage =
    result.signal === "green"
      ? `已達綠燈門檻，完整淨時薪約 ${formatNumber(result.fullHourly)} 元。`
      : result.signal === "yellow"
        ? `再多 ${shortfall} 元可到綠燈；先看店家候餐與送達區域。`
        : `至少需要 ${roundUp(result.yellowMinimum)} 元才進入黃燈範圍。`;

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="回到頁首">
          <span className="brand-mark">接</span>
          <span>
            <strong>接單雷達</strong>
            <small>勁戰七代 125 ABS · 92 無鉛</small>
          </span>
        </a>
        <button className="icon-button" type="button" onClick={() => setSettingsOpen(!settingsOpen)}>
          {settingsOpen ? "完成" : "設定"}
        </button>
      </header>

      <section className={`decision-card signal-${result.signal}`} id="top">
        <div className="decision-copy">
          <div className="eyebrow">這張訂單</div>
          <div className="decision-line">
            <span className="signal-dot" aria-hidden="true" />
            <h1>{STATUS[result.signal].label}</h1>
          </div>
          <p>{resultMessage}</p>
        </div>
        <div className="decision-score" aria-label={`${STATUS[result.signal].label}，完整淨時薪 ${formatNumber(result.fullHourly)} 元`}>
          <strong>{formatNumber(result.fullHourly)}</strong>
          <span>完整淨時薪</span>
        </div>
      </section>

      <section className="input-panel" aria-labelledby="offer-title">
        <div className="section-heading">
          <div>
            <span className="step-label">01</span>
            <h2 id="offer-title">輸入派單資訊</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setAmount(132);
              setDistance(8.4);
              setMinutes(35);
              setExtraWait(0);
              setReturnRisk(false);
            }}
          >
            載入官方範例
          </button>
        </div>

        <div className="input-grid">
          <label className="field">
            <span>預估外送費</span>
            <div className="input-wrap">
              <i>$</i>
              <input
                inputMode="decimal"
                min="0"
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                aria-label="預估外送費"
              />
              <b>元</b>
            </div>
          </label>
          <label className="field">
            <span>總距離</span>
            <div className="input-wrap">
              <input
                inputMode="decimal"
                min="0"
                step="0.1"
                type="number"
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
                aria-label="總距離"
              />
              <b>公里</b>
            </div>
          </label>
          <label className="field">
            <span>預估時間</span>
            <div className="input-wrap">
              <input
                inputMode="numeric"
                min="1"
                type="number"
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                aria-label="預估時間"
              />
              <b>分鐘</b>
            </div>
          </label>
        </div>

        <div className="adjustments">
          <div className="adjustment-row">
            <div>
              <strong>額外候餐</strong>
              <span>Uber 預估以外的等待</span>
            </div>
            <div className="segment-control" aria-label="額外候餐時間">
              {[0, 5, 10].map((value) => (
                <button
                  className={extraWait === value ? "active" : ""}
                  key={value}
                  onClick={() => setExtraWait(value)}
                  type="button"
                >
                  {value === 0 ? "無" : `+${value}`}
                </button>
              ))}
            </div>
          </div>
          <label className="adjustment-row switch-row">
            <div>
              <strong>偏僻區／可能空車回程</strong>
              <span>計算距離自動增加 30%</span>
            </div>
            <input
              checked={returnRisk}
              onChange={(event) => setReturnRisk(event.target.checked)}
              type="checkbox"
              role="switch"
            />
          </label>
        </div>
      </section>

      <section className="metrics" aria-label="計算結果">
        <article>
          <span>每公里收入</span>
          <strong>{formatNumber(result.perKm, 1)}</strong>
          <small>元 / km</small>
        </article>
        <article>
          <span>現金淨時薪</span>
          <strong>{formatNumber(result.cashHourly)}</strong>
          <small>扣 {settings.cashCostPerKm} 元 / km</small>
        </article>
        <article>
          <span>92 油錢</span>
          <strong>{formatNumber(result.fuelCost, 1)}</strong>
          <small>{result.effectiveDistance.toFixed(1)} km 合計</small>
        </article>
      </section>

      <section className="threshold-panel">
        <div className="threshold-copy">
          <span className="step-label">02</span>
          <h2>最低要多少才值得？</h2>
          <p>同時考慮每公里收入、完整車輛成本與時間。</p>
        </div>
        <div className="threshold-amount">
          <span>綠燈最低</span>
          <strong>${roundUp(result.greenMinimum)}</strong>
          {shortfall > 0 ? <small>目前還差 ${shortfall}</small> : <small>目前已達標</small>}
        </div>
      </section>

      <div className="primary-actions">
        <button className="save-button" type="button" onClick={saveResult}>
          儲存這次判斷
        </button>
        <button className="secondary-button" type="button" onClick={() => setHistoryOpen(!historyOpen)}>
          {historyOpen ? "收起紀錄" : `查看紀錄${history.length ? ` (${history.length})` : ""}`}
        </button>
      </div>

      <section className="quick-fill" aria-labelledby="quick-fill-title">
        <div className="section-heading compact-heading">
          <div>
            <span className="step-label">03</span>
            <h2 id="quick-fill-title">貼上 OCR 文字</h2>
          </div>
          <button className="text-button" type="button" onClick={readClipboard}>讀取剪貼簿</button>
        </div>
        <p>已支援新版派單格式，例如「$132　35 分鐘 (8.4 公里) 總計」。</p>
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="$132  35 分鐘 (8.4 公里) 總計"
          aria-label="OCR 文字"
        />
        <div className="parse-actions">
          <button type="button" onClick={() => parseOfferText(rawText)}>解析並填入</button>
          {parseMessage ? <span>{parseMessage}</span> : null}
        </div>
      </section>

      {historyOpen ? (
        <section className="history-panel" aria-labelledby="history-title">
          <div className="section-heading compact-heading">
            <div>
              <span className="step-label">紀錄</span>
              <h2 id="history-title">最近的判斷</h2>
            </div>
            <span className="local-note">只存在這台裝置</span>
          </div>
          {history.length === 0 ? (
            <p className="empty-state">尚未儲存任何訂單。</p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <article className={`history-item signal-${item.signal}`} key={item.id}>
                  <div className="history-signal">{STATUS[item.signal].short}</div>
                  <div>
                    <strong>${item.amount} · {item.distance} km · {item.minutes} 分</strong>
                    <span>{new Date(item.createdAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="history-metric">
                    <strong>{numberFormatter.format(item.fullHourly)}</strong>
                    <span>元 / hr</span>
                  </div>
                  <button type="button" onClick={() => removeHistoryItem(item.id)} aria-label="刪除此筆紀錄">×</button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {settingsOpen ? (
        <section className="settings-panel" aria-labelledby="settings-title">
          <div className="section-heading compact-heading">
            <div>
              <span className="step-label">個人化</span>
              <h2 id="settings-title">計算設定</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>恢復預設</button>
          </div>
          <div className="settings-grid">
            {[
              ["fuelPrice", "92 油價", "元 / L", 0.1],
              ["fuelEconomy", "官方油耗", "km / L", 0.1],
              ["cashCostPerKm", "現金成本", "元 / km", 0.1],
              ["fullCostPerKm", "完整成本", "元 / km", 0.1],
              ["greenHourly", "綠燈淨時薪", "元 / hr", 10],
              ["yellowHourly", "黃燈淨時薪", "元 / hr", 10],
              ["greenPerKm", "綠燈每公里", "元 / km", 1],
              ["yellowPerKm", "黃燈每公里", "元 / km", 1],
            ].map(([key, label, unit, step]) => (
              <label className="setting-field" key={String(key)}>
                <span>{String(label)}</span>
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={Number(step)}
                    min="0"
                    value={settings[key as keyof CalculatorSettings]}
                    onChange={(event) => updateSetting(key as keyof CalculatorSettings, Number(event.target.value))}
                  />
                  <small>{String(unit)}</small>
                </div>
              </label>
            ))}
          </div>
          <p className="setting-explainer">
            現金成本適合即時接單；完整成本包含折舊，適合月底檢查真正獲利。
          </p>
        </section>
      ) : null}

      <footer>
        <div>
          <strong>目前基準</strong>
          <span>92 油錢 {result.fuelPerKm.toFixed(2)} 元 / km · 官方油耗 44.8 km/L</span>
        </div>
        <div className="source-links">
          <a href="https://www.yamaha-motor.com.tw/news/news-202509-cygnus-x" target="_blank" rel="noreferrer">Yamaha 規格</a>
          <a href="https://www.cpc.com.tw/" target="_blank" rel="noreferrer">中油牌價</a>
          <a href="https://www.uber.com/tw/zh-tw/blog/delivery-partner-start-trips/" target="_blank" rel="noreferrer">新版派單卡</a>
        </div>
        <p>請在停妥車輛後操作。畫面結果是估算，不代表平台實際收入。</p>
      </footer>
    </main>
  );
}
