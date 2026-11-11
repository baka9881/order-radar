# Claude 開發指引 (CLAUDE.md)

本文件對齊 `AGENTS.md`，為在 **接單雷達 (Order Radar)** 專案協作的 AI 提供操作指引。

## 代理人工作流 (Workflow)
1. **任務規劃**：非簡單任務（3 個步驟以上）務必先在 `tasks/todo.md` 中進行規劃。
2. **免確認執行 (YOLO 模式)**：專案已啟用 YOLO 模式，大膽執行指令以加速開發。
3. **完成前驗證**：在宣佈任務完成前，必須執行測試並徹底驗證。
4. **交接紀錄維護**：每次任務完成後更新 `CONTEXT.md` 作為開發紀錄交接文件。

## 常用指令 (Commands)
- **Web 端開發**：`npm run dev`（啟動 vinext dev 伺服器，預設 `http://localhost:3000`）
- **Web 端建置與測試**：`npm run build`、`npm test`
- **Mobile 端開發**：`cd mobile && npx expo start --web`（預設 `http://localhost:8081`）
- **Mobile 端測試**：`cd mobile && npm test`
- **資料庫遷移生成**：`npm run db:generate`
- **同步執法點快照**：`npm run data:mobile`

## 程式碼規範
- 一律使用繁體中文（臺灣用語），技術術語保留英文。
- 保持不可變資料原則，函數 < 50 行，檔案 < 800 行，巢狀 < 4 層。
- 絕不硬編碼任何敏感資訊。
