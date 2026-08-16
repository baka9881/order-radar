# Git 分支合併與推送規劃 (tasks/todo.md)

## 待辦清單
- [ ] 步驟 1：檢查當前 Git 分支、遠端設定與未提交狀態 (`git status`, `git branch -a`)
- [ ] 步驟 2：提交本地變更 (`git add`, `git commit`)
- [ ] 步驟 3：獲取遠端最新變更 (`git fetch origin`)，檢視遠端分支狀態
- [ ] 步驟 4：切換至主分支 (`main` 或目標分支)，合併/變基分支，若有衝突即刻排除
- [ ] 步驟 5：執行完整測試 (`npm test` 雙端) 驗證合併後程式碼無損
- [ ] 步驟 6：推送至遠端倉庫 (`git push`)，確認主分支保持最新
- [ ] 步驟 7：更新 `CONTEXT.md` 交接紀錄
