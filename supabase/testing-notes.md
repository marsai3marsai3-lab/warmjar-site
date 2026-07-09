# 金流／第三方服務測試注意事項

記錄實際跑過才發現、官方文件沒說清楚或跟文件不一致的地方，避免下次測試重踩同樣的坑。

## ECPay 綠界（訂金付款，Phase 3-1）

驗證日期：2026-07-08。訂單 `WJmrbmra5kcb87cf`，NT$640，真實走完整流程（含真實簡訊 3D 驗證），確認 `deposit_records` 轉 `paid`、`appointments` 轉 `confirmed`。

1. **3D 驗證碼不是官方文件寫的固定 `1234`**——ECPay 官方文件
   （developers.ecpay.com.tw）寫「測試環境 3D驗證簡訊固定為 1234，
   不需用手機接收簡訊」，但實測 staging 的 3D 驗證頁**會真的發一組
   簡訊驗證碼**到你輸入的手機號碼，要用真實收到的那組碼，不是
   `1234`。測試前手機要能收簡訊。
2. **付款頁有「測試付款請點此」快速通過按鈕**——ECPay 測試環境的
   信用卡付款頁，除了正常刷卡＋3D驗證流程外，另外有一個可以直接
   跳過刷卡、模擬付款成功的捷徑按鈕，測試時優先找這顆按鈕，比慢慢
   刷測試卡號＋等簡訊快很多。

其餘官方文件內容（測試卡號、持卡人姓名需 2 字元以上英文＋符號、
有效期限需大於當下月年）目前實測跟文件一致，沒有落差。

## 架構決策記錄

### RLS 政策：目前整個專案完全沒有寫（Phase 3-2）

`/book`、`/admin` 全部經由 service-role client 存取 Supabase，authorization
全部寫在應用層（session 檢查 + email 白名單 / OTP session），Postgres RLS
啟用但沒有任何 CREATE POLICY——等於預設全擋，只有 service-role 能讀寫。

**Phase 3-2 的 `/admin/calendar` 即時同步因此改用 Realtime Broadcast**
（`src/lib/admin/realtime.ts`），不是 Postgres Changes：Server Action
寫入資料後，用 service-role 呼叫 `channel.httpSend()` 廣播一個不含個資的
輕量事件（`{appointmentId, date}`），前端行事曆頁面訂閱同一個 public
broadcast channel，收到事件就 `router.refresh()` 重新抓資料。這個
channel **沒有 RLS／Realtime Authorization 保護**，理論上知道 channel
名稱（`admin:calendar`）的人都能訂閱到「有什麼東西被改了」的通知
（不含姓名/電話/服務內容），對內部工具來說風險可控，這是有意識的
取捨，不是疏忽。

**⚠️ 若未來要開放多店家（multi-tenant）或任何外部/客戶端直接存取
Supabase（不再是「全部經過我們自己的 server」這個假設），這個決策
要重新檢視**：屆時需要真的寫 RLS 政策（依 `profiles.role` +
`auth.uid()`），並把 Realtime channel 換成 Supabase 的 Realtime
Authorization（private channel，RLS 控制誰能訂閱），現在的 public
broadcast channel 屆時就不夠安全了。
