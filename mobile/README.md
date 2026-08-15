# 接單雷達 iOS App

這是接單雷達的 Expo／React Native 手機版，使用 Expo SDK 57。Windows 可完成日常開發、雲端建置與 App Store 上傳，不需要本機 Mac。

## 已完成

- 原生 Apple Maps 地圖與目的地標記
- GPS 速度、前景語音／震動提醒
- 使用者明確同意後的背景定位與本機通知
- 1,849 筆政府公開固定設備離線快照
- 勁戰七代 125 ABS／92 無鉛接單試算
- 本機訂單紀錄、成本設定及一鍵清除
- 1024×1024 RGB App Store 圖示、品牌啟動畫面、權限說明、EAS 建置設定
- App Store 隱私、支援與送審文件

## Windows 開發

```powershell
cd mobile
npm install
npm start
```

前景定位與地圖可先用 Expo Go 測試。背景定位無法在 Expo Go 執行，必須使用 EAS development build 安裝到真實 iPhone。

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
