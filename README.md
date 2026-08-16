# 接單雷達 (Order Radar)

專為**臺灣外送員**（Uber Eats / Foodpanda 等）打造的成本試算、即時車速、政府公開固定執法設備警示與安全輔助工具。

---

## 產品核心功能

1. **接單效益與實質時薪試算**：輸入外送費、里程與預估時間，自動扣除油資、機油輪胎耗材與車輛折舊，給予接單燈號評判（綠燈/黃燈/紅燈）。
2. **固定測速與科技執法提醒**：整合政府公開資料（1,800+ 筆點位），提供即時車速與前置語音/震動警報。
3. **隱私至上設計**：行車雷達比對全程在裝置本機端完成，不儲存或上傳即時 GPS 軌跡；自願加入之市場數據在手機端進行約 2 公里區間化去識別處理。

---

## 專案雙端架構

| 平台 | 技術棧 | 說明 |
| :--- | :--- | :--- |
| **Web 網站 & API** | Next.js 16 + React 19 + vinext + Tailwind CSS v4 + Cloudflare D1 | 網頁版接單試算器、API 服務與 App Store 審查政策頁面 |
| **Mobile App** | Expo SDK 57 + React Native 0.86 + Apple Maps | iOS 原生 App，支援離線資料庫、背景定位與語音通知 |

---

## 環境需求 (Prerequisites)

- **Node.js** `>= 22.13.0`
- **npm** (隨附於 Node.js)

---

## 快速上手與開發預覽

### 1. Web 端網站開發
```bash
npm install
npm run dev
```
- 開發預覽網址：`http://localhost:3000/`
- 除錯介面：`http://localhost:3000/__debug`

### 2. Mobile App 行動端開發（預設瀏覽器裝置模擬）
```bash
cd mobile
npm install
npx expo start --web
```
- 瀏覽器開啟：`http://localhost:8081`
- 按下 `F12` 開啟開發者工具，按 `Ctrl + Shift + M` 切換為 **iPhone 14 Pro / 15 Pro** 視角即可完整操作。

---

## 常用指令 (Scripts)

### 根目錄（Web & 全域）
- `npm run dev`：啟動 Web 本地開發伺服器
- `npm run build`：驗證與建置 vinext Web 產物
- `npm test`：執行 Web 端 SSR 與頁面渲染測試
- `npm run db:generate`：產生 Drizzle ORM 資料庫遷移檔案
- `npm run data:mobile`：從本地 API 重新整理 Mobile 離線執法設備點位快照

### Mobile 目錄 (`mobile/`)
- `npx expo start --web`：啟動 React Native Web 開發伺服器（推薦預覽）
- `npm start`：啟動 Expo Metro Bundler（供 Expo Go 或 EAS 開發版掃描）
- `npm test`：執行行動端 Vitest 單元測試
- `npm run validate`：依序執行 TypeCheck、測試與 iOS Bundle 匯出驗證
- `npm run build:ios:dev`：透過 EAS 雲端建置真機測試包

---

## 專案目錄結構

```plaintext
order-radar/
├── app/                  # Web 前端頁面與後端 API (Next.js / vinext)
│   ├── OrderCalculator.tsx # 外送接單成本與淨利試算面板
│   ├── NavigationPanel.tsx # 網頁端執法設備地圖與點位清單
│   ├── api/              # 後端 API (執法點資料聚合、自願匿名資料計畫、回饋)
│   ├── privacy/ & terms/ # 隱私權政策與服務條款（符合 App Store 上架規範）
│   └── chatgpt-auth.ts   # Sign in with ChatGPT 身份驗證模組
├── mobile/               # 行動端 iOS 專案 (Expo SDK 57 / React Native)
│   ├── App.tsx           # 行動端主入口與 Tab 導航
│   ├── src/
│   │   ├── components/   # 跨平台元件 (RadarMap, NumericField)
│   │   ├── screens/      # 畫面 (試算器、雷達地圖、歷史紀錄、設定、開場條款)
│   │   ├── order-engine.ts # 核心成本與時薪計算引擎
│   │   ├── enforcement.ts  # 離線執法設備距離計算與快取
│   │   └── background-location.ts # iOS 背景定位與本機通知
│   └── store/            # App Store 上架審核中繼資料與隱私標籤
├── db/                   # 資料庫定義 (Cloudflare D1)
│   └── schema.ts         # 使用者、訂單與回饋之 Drizzle Schema
├── worker/               # Cloudflare Workers 入口點
├── scripts/              # 工具腳本 (同步政府公開執法點位)
└── tests/                # Web 端與 SSR 渲染測試
```

---

## 授權與隱私說明
本專案執法設備點位取自政府資料開放平臺公開資料，純供行車安全警示使用。使用者位置僅於裝置端本機比對，不作未授權追蹤。
