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

# 公開專案與英文文件規劃

## 待辦清單
- [x] 步驟 1：盤點 Repository、對外文件與目前可見性
- [x] 步驟 2：掃描目前內容與完整 Git 歷史中的敏感資訊
- [x] 步驟 3：將對外 README 與 GitHub Repository 簡介改為英文
- [x] 步驟 4：執行測試與建置驗證
- [x] 步驟 5：提交並推送文件變更
- [x] 步驟 6：將 Repository 可見性切換為 Public 並從訪客角度驗證
- [x] 步驟 7：更新 `CONTEXT.md` 交接紀錄

## 任務回顧
- `order-radar` 與 `finance-home` 均已改為 Public，GitHub Repository 簡介與主要 README 均使用英文。
- 兩個 Repository 已啟用 GitHub secret scanning 與 push protection。
- 完整歷史與 staged changes 均未偵測到敏感資訊。
