# 專案開發交接紀錄 (CONTEXT.md)

## 專案概述
- **專案名稱**：接單雷達 (Order Radar)
- **用途**：臺灣外送員接單成本與實質時薪試算、GPS 即時車速、政府公開固定執法設備（測速照相、科技執法）安全提醒與數據去識別分析。
- **架構**：
  - **Web 端 (`app/`, 埠號 `3000`)**：Next.js 16 + React 19 + vinext / Cloudflare Workers + D1 (Drizzle ORM)。
  - **Mobile 端 (`mobile/`, 埠號 `8081`)**：Expo SDK 57 + React Native 0.86 + Apple Maps。

## 重要檔案與指引文件
- [README.md](file:///D:/Workspace/order-radar/README.md)：專案快速啟動與架構說明（繁體中文）。
- [AGENTS.md](file:///D:/Workspace/order-radar/AGENTS.md)：AI Agent 專案通用開發規範與架構規範。
- [CLAUDE.md](file:///D:/Workspace/order-radar/CLAUDE.md)：開發指令集與程式碼標準。
- [mobile/README.md](file:///D:/Workspace/order-radar/mobile/README.md)：行動端 iOS 開發與 EAS 打包指南。
- [mobile/APP_STORE_CHECKLIST.md](file:///D:/Workspace/order-radar/mobile/APP_STORE_CHECKLIST.md)：App Store 上架審查檢查表。

## 雙端預覽標準
1. **行動端 (Mobile)**：`cd mobile && npx expo start --web` -> 瀏覽器開啟 `http://localhost:8081`（F12 切換 iPhone 14/15 Pro 裝置模擬）。
2. **網站端 (Web)**：`npm run dev` -> 瀏覽器開啟 `http://localhost:3000/`。

## 測試驗證紀錄
- Web 端建置與 SSR 測試：`npm test`（6/6 Passed）
- Mobile 單元測試：`npm test`（8/8 Passed）
