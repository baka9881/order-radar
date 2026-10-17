# Netlify 獨立部署

正式目標：https://order-radar-tw.netlify.app
專案 ID：5a02d002-05b2-4663-93c1-8ebd5c8f903a

網站採用 Next.js SSR / Route Handlers、Netlify Database (Postgres) 和 Netlify Identity。
`npm run build` 或 `npm run build:netlify` 建立 `.next`；不可再用 `out` 靜態匯出。
`npm test` 以真正的 Next.js HTTP 伺服器驗證頁面、訂單試算與拒絕偽造登入標頭。

## 管理

- Identity 必須在 Netlify 專案的 Identity 頁面啟用。註冊、登入、重設密碼使用 `/account`。
- 使用者密碼由 Netlify Identity 管理，不存進應用資料庫。
- 資料庫遷移位於 `netlify/database/migrations/`，部署時套用。不要手動改已套用的遷移。
- 本機執行資料庫相關功能需 Netlify 開發環境；純試算不需要資料庫。
- `.netlify` 與 `.env*` 已排除 Git。不要提交連線字串或存取權杖。
- Netlify 的使用額度與費用由 Netlify 帳號管理，與 ChatGPT 訂閱分開。

## 舊資料檢查（2026-10-18 台灣時間）

Sites 的 orders、feedback、market_contributions 均為空；profiles 只有一個免費會員。
舊會員留在舊站，新站重新註冊後建立自己的會員 ID，不把不可信的 Sites 標頭當作登入。
本機瀏覽器資料受網址隔離，不會自動移到新網址；手機 AsyncStorage 紀錄仍在原裝置。

手機來源碼已更新網站與 API 預設網址。已安裝的 App / 已發布 Expo 更新仍需另外發布新版才會使用新網址。
舊 `.openai`、Workers 與 SQLite 遷移保留作歷史參考；本次不部署回 Sites。

## 驗證與發布

先執行 `npm test`，再以 Netlify 預覽部署確認頁面、API 和資料庫。
會員註冊／信箱驗證需實際在部署網址測試，純本機不能證明完整登入可用。
預覽測試通過後才部署正式站。Git 自動部署若啟用，後續推送的分支須包含此遷移。
