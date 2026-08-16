# 接單雷達手機 App

這是接單雷達的 Expo／React Native 手機版，目前使用 Expo SDK 54。Windows 可完成日常開發、Android 雲端建置與 App Store 上傳，不需要本機 Mac。

## 已完成

- 原生 Apple Maps 地圖與目的地標記
- GPS 速度、前景語音／震動提醒
- 使用者明確同意後的背景定位與本機通知
- 1,849 筆政府公開固定設備離線快照
- 勁戰七代 125 ABS／92 無鉛接單試算
- Android 螢幕分享、裝置端 OCR 與即時紅黃綠判單
- Android 浮動判斷卡、高優先通知、重複訂單過濾及黑畫面偵測
- 本機訂單紀錄、成本設定及一鍵清除
- 開場分開記錄使用條款與自願匿名資料計畫選擇
- 訂單資料先在手機區間化、每筆可撤回刪除、原始位置與路線不上傳
- 1024×1024 RGB App Store 圖示、品牌啟動畫面、權限說明、EAS 建置設定
- App Store 隱私、支援與送審文件

## Windows 開發

```powershell
cd mobile
npm install
npm start
```

前景定位與地圖可先用 Expo Go 測試。背景定位與 Android 自動判單都含原生程式碼，無法在 Expo Go 執行，必須安裝 EAS APK。

## Android 自動判單測試

1. 執行 `npm run build:android:apk`，或安裝最新的 EAS preview APK。
2. 從地圖右側點「判」，進入「即時自動判單」。
3. 先允許浮動判斷卡，再點「開始自動判單」。
4. 閱讀 App 內的螢幕監看揭露，然後在 Android 系統視窗只選 Uber Eats。
5. 切換到 Uber Eats，等待測試訂單畫面出現。
6. 若擷取正常，約一秒內會顯示「接／看／拒」；若只取得黑畫面，App 會顯示 Uber Eats 可能封鎖擷取。

辨識和計算都在手機內完成。原始畫面不會寫入檔案、相簿、資料庫或上傳；App 只保留最後一次由金額、公里與分鐘產生的計算結果。詳細情境見 [ANDROID_ORDER_CAPTURE_TEST.md](./ANDROID_ORDER_CAPTURE_TEST.md)。

## 驗證

```powershell
npm run validate
```

這會依序執行 TypeScript 檢查、核心計算測試及 iOS JavaScript bundle 匯出。

## 更新政府公開設備快照

先在專案根目錄啟動網站 API，再執行同步：

```powershell
npm run dev
npm run data:mobile
```

## 沒有 Mac 的 iOS 建置

1. 申請 Apple Developer Program，並建立 Expo 帳號。
2. 在 `mobile` 執行 `npx eas-cli@latest login`。
3. 執行 `npx eas-cli@latest init`，讓 Expo 寫入真實 `projectId`。
4. 確認 `app.json` 的 `ios.bundleIdentifier` 屬於你的 Apple 帳號。
5. 執行 `npm run build:ios:dev`，安裝到 iPhone 做背景定位道路測試。
6. 測試通過後執行 `npm run build:ios` 與 `npm run submit:ios`。

Apple／Expo 登入資訊、憑證、`.p8`、`.p12`、provisioning profile 與密碼不可提交到 Git。

送審前逐項完成 [APP_STORE_CHECKLIST.md](./APP_STORE_CHECKLIST.md)。
