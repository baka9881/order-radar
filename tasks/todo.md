# Git 分支合併與推送規劃 (tasks/todo.md)

## 待辦清單
- [x] 步驟 1：檢查當前 Git 分支、遠端設定與未提交狀態 (`git status`, `git branch -a`)
- [x] 步驟 2：提交本地變更 (`git add`, `git commit`)
- [x] 步驟 3：獲取遠端最新變更 (`git fetch origin`)，檢視遠端分支狀態
- [x] 步驟 4：切換至主分支 (`main`)，合併 `origin/codex/expo-go-sdk54` 分支並排除衝突
- [x] 步驟 5：執行完整測試 (`npm test` 雙端 + TypeScript 檢查) 驗證合併後程式碼無損
- [x] 步驟 6：推送至遠端倉庫 (`git push origin main`)，確認主分支保持最新
- [x] 步驟 7：更新 `CONTEXT.md` 交接紀錄

## 任務回顧
- 分支 `origin/codex/expo-go-sdk54` 已成功合併至 `main` 主分支。
- 排除 `package.json`、`package-lock.json`、`NavigationScreen.tsx` 衝突，升級全螢幕 Map-First 雷達儀表板，並維持 Web 跨平台相容。
- 雙端測試全數通過，主分支已成功推送至遠端 `origin/main`。
