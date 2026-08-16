# 專案開發交接紀錄 (CONTEXT.md)

## 專案概述
- **專案名稱**：接單雷達 (Order Radar)
- **用途**：臺灣外送員接單成本與實質時薪試算、GPS 即時車速、政府公開固定執法設備（測速照相、科技執法）安全提醒與數據去識別分析。
- **最新狀態**：
  - `origin/codex/expo-go-sdk54` 分支已完全合併至 `main` 主分支。
  - 整合了全螢幕 Map-First 雷達儀表板（今日儀表、單量統計、圖層切換、自訂標記）。
  - 已排除衝突並全面驗證雙端建置與測試。
  - `main` 分支已成功推送到遠端 GitHub 倉庫 (`origin/main`)，保持最新狀態。

## 雙端執行與測試
- **Web 端** (`app/`, 埠號 `3000`)：`npm run dev` / `npm test`（6/6 通過）
- **Mobile 端** (`mobile/`, 埠號 `8081`)：`npx expo start --web` / `npm test`（8/8 通過）
