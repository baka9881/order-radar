# App Store 上架檢查表

## 目前已完成

- [x] Expo SDK 57／React Native App，不是 WebView 包殼
- [x] iOS Bundle ID 暫定為 `com.baka0406.orderradar`
- [x] 1024×1024 不透明 App icon
- [x] 前景與背景定位權限文案
- [x] 背景定位只在使用者主動啟用後開始
- [x] 本機通知、語音與震動提醒
- [x] Apple Maps 地圖與外部正式導航
- [x] 訂單、設定與位置比對採裝置本機處理
- [x] App 內可清除全部本機資料
- [x] 不需登入即可使用核心功能
- [x] 隱私權政策、使用條款與支援頁內容
- [x] App Store 中文文案與審核備註草稿
- [x] EAS development／preview／production 設定

## 需要帳號持有人完成

- [ ] 加入 Apple Developer Program
- [ ] 建立／登入 Expo 帳號
- [ ] 執行 `npx eas-cli@latest init` 綁定 EAS project ID
- [ ] 在 Apple Developer 確認 Bundle ID 可用，必要時修改 `app.json`
- [ ] 建立 App Store Connect App 記錄
- [ ] 將隱私與支援頁發布成任何人不登入即可開啟的公開網址
- [ ] 用 EAS development build 在真實 iPhone 測試
- [ ] 測試「使用 App 期間」與「永遠」定位權限各種拒絕／允許流程
- [ ] 實際道路測試提醒距離、耗電、鎖定畫面與背景行為
- [ ] 在至少兩種 iPhone 螢幕尺寸檢查版面
- [ ] 依 App Store Connect 當下要求上傳截圖、分類、年齡分級與聯絡資料
- [ ] 在 App Privacy 選擇「不收集資料」前，確認正式版未新增分析、廣告、雲端同步或第三方 SDK
- [ ] 於 App Review Notes 貼上 `store/app-review-notes.zh-TW.md` 的內容
- [ ] 先發布 TestFlight 外部測試，再送正式審核

## 第 1 版刻意不加入

- 登入與雲端同步：降低隱私及 Sign in with Apple 審核複雜度。
- Pro 訂閱：先驗證定位可靠性與使用需求。加入數位功能訂閱時必須用 StoreKit／App Store In-App Purchase，並更新隱私與審核資料。
- 流動執法回報：產品只處理政府公開固定設備，定位為安全提醒而非規避執法。
