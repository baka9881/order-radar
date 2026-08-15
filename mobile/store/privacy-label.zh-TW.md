# App Privacy 回答草稿（第 1 版）

建議在 App Store Connect 選擇：**Data Not Collected／不收集資料**。

依目前程式碼：

- 精確位置只在裝置上比對離線設備快照，沒有傳送到接單雷達伺服器。
- 訂單、成本設定及提醒狀態只存在 AsyncStorage。
- Apple Maps／iOS 系統服務由 Apple 處理的資料，不是開發者收集的資料。
- 沒有廣告、分析、指紋辨識、跨 App 追蹤、登入、雲端同步或 App 內付款 SDK。

送審前必須重新稽核正式 build。若加入任何分析、錯誤回報、帳號、雲端同步、訂閱或廣告 SDK，不得直接沿用本答案，必須依實際行為更新 App Privacy 與隱私權政策。
