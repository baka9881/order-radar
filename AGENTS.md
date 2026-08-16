# Agent 開發指引 (AGENTS.md)

本文件對齊 `CLAUDE.md`，為在 **接單雷達 (Order Radar)** 專案協作的 AI Agent 提供明確的操作規範與架構指南。

## 代理人工作流 (Workflow)
1. **任務規劃**：非簡單任務（3 個步驟以上或架構決策）務必先在 `tasks/todo.md` 中進行規劃。
2. **免確認執行 (YOLO 模式)**：專案已永久啟用 YOLO 模式，請大膽執行指令以加速開發。
3. **完成前驗證**：在標記任務完成前，必須徹底驗證（如 `npm test`、建置檢查與記錄日誌）。
4. **交接紀錄維護**：任務結束後持續更新根目錄 `CONTEXT.md` 作為開發交接紀錄。

## 專案雙端架構規範
- **Web 端 (`app/`)**：
  - 採用 Next.js 16 + React 19 + vinext / Cloudflare Workers + D1 (Drizzle ORM)。
  - 樣式採用 Tailwind CSS v4。
  - 公開內容支援匿名存取，認證頁面採用 Sign in with ChatGPT (SIWC) 標頭驗證。
- **Mobile 端 (`mobile/`)**：
  - 採用 Expo SDK 57 + React Native 0.86。
  - 原生端採用 Apple Maps (`react-native-maps`) 與背景定位 (`expo-location` + `expo-task-manager`)。
  - Web 預覽模式採用抽象相容元件 (`RadarMap.web.tsx`)，避免原生模組崩潰。

## 程式碼與品質標準
- 一律使用繁體中文（臺灣用語），技術術語可保留英文。
- 優先不可變資料，不直接修改既有物件。
- 函數盡量小於 50 行，單檔盡量小於 800 行，巢狀不超過 4 層。
- 例外不可靜默吞掉；API 邊界需回傳結構化回應 (`success`, `data`, `error`)。
- 絕不硬編碼敏感資訊（API keys、Tokens、Secrets）。
