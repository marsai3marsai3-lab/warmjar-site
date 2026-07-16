# Stage 6A-1 真機驗收指南（逐按鈕實測）

> 狀態：**已關閉，驗收全數通過**（2026-07-20 首日 + 2026-07-21 隔日複查）
> 對應：docs/phase6-stage-split-design.md v2.2 驗收標準 1–7 項
> 建議放置：docs/phase6-stage6a1-acceptance-guide.md
> **v2.2 更新**：因應 LINE 平台改制（Messaging API channel 不可再新增 LIFF app），
> 前置條件的 Console 操作從兩件事改為三件事，並在 LIFF 綁定驗收區補一步驗證跨
> channel userId 一致性，見下方標記。

---

## 零、前置條件（缺一不可開始）

- [ ] Channel 權限已認回：可登入 developers.line.biz 看到溫罐子 Messaging API channel（ID: 2004034061）
- [ ] **（v2.2 更新）Console 操作改為三件事**：
      (a) 抄錄 Messaging API channel Basic settings 的 Channel ID / Channel secret（唯讀）；
      (b) 於**同一 Provider**（2002675868）底下新建自建 LINE Login channel（命名
      `warmjar-booking`，跟夯客既有的「溫罐子」Login channel 區分開，那支是禁碰項）；
      (c) 於這個新 Login channel 的 LIFF 分頁新增 LIFF app（Size: Full；Scopes:
      `profile` + `openid`；Endpoint URL 填 cloudflared 網址），抄 LIFF ID 與這個
      Login channel 的 Channel ID
- [ ] .env.local 親手填妥：`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、
      `LINE_LOGIN_CHANNEL_ID`（**v2.2 新增**，填步驟 (b) 新建的 Login channel
      Channel ID）、`NEXT_PUBLIC_LIFF_ID`（填步驟 (c) 的 LIFF ID）、`CRON_SECRET`
      （`LINE_CHANNEL_ACCESS_TOKEN` 留空不填）
- [ ] cloudflared 通道開啟，本機 dev server 運行，指向 warmjar-dev 資料庫
- [ ] 測試工具：暘自己的手機 LINE（已加溫罐子 OA 好友）、warmjar-dev 內一筆測試會員資料
- [ ] **基準快照（重要）**：驗收開始前，先用手機走一遍夯客現況並記錄——傳訊息給 OA 看自動回覆、看 Rich Menu 長相、走一次夯客預約看通知。這是「驗收前基準」，之後比對用。

> ⚠️ 全程禁區重申：不碰 Webhook URL 區塊（含 Verify 按鈕與 Use webhook 開關）、
> 不碰 long-lived token 的 Issue/Reissue、不建立 Rich Menu、不動 manager.line.biz
> 任何設定、不編輯或刪除夯客既有的 LIFF app、**（v2.2 新增）**不編輯或刪除夯客既有
> 的 LINE Login channel「溫罐子」。

---

## 一、Token Manager 煙霧測試（驗收標準 1）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 1-1 | /admin 手動建一筆測試會員的預約 | 建單成功 | | |
| 1-2 | 觀察手機 LINE | 收到預約確認推播，內容正確（姓名/時間/服務） | | |
| 1-3 | 檢查 server log | 有 stateless token 發行紀錄，無 fallback 到靜態 token | | |
| 1-4 | 短時間內再觸發一次推播 | log 顯示 token 快取命中，未重複發行 | | |
| 1-5 | 檢查 notifications_log | 該筆推播狀態為成功 | | |

## 二、LIFF 綁定流程（驗收標準 2）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 2-1 | 手機開啟自建 LIFF 連結 | LINE 內開啟，跳授權畫面（首次） | | |
| 2-2 | 同意授權 | 進入綁定/會員頁，無錯誤 | | |
| 2-3 | 完成會員綁定 | 畫面顯示綁定成功 | | |
| 2-4 | 查 warmjar-dev profiles 表 | 該會員 line_user_id 已寫入 | | |
| 2-5 | 關閉後重開 LIFF | 不再要求授權，直接進入（同一 userId） | | |
| 2-6 | **（v2.2 新增）**以該會員（剛用 LINE Login channel `warmjar-booking` 綁定的 userId）觸發一筆推播（如建一筆測試預約） | 手機**收到**推播——**這是實證跨 channel userId 一致性的關鍵一步**：LIFF 綁定寫入的 line_user_id 來自 LINE Login channel，推播發送用的是 Messaging API channel，兩者若不同 Provider 會拿到不同 userId 值，這裡收得到就證明 §一查證（同 Provider 下 userId 一致）在真機上成立，收不到要優先懷疑新建的 Login channel 是不是不小心建到別的 Provider 底下 | | |

## 三、cron 提醒推播（驗收標準 3）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 3-1 | 建一筆落在提醒時間窗內的預約 | 建單成功 | | |
| 3-2 | 手動觸發 cron endpoint（帶 CRON_SECRET） | 回應成功 | | |
| 3-3 | 觀察手機 | 收到提醒推播 | | |
| 3-4 | 不帶 CRON_SECRET 再打一次 | 被拒絕（401/403） | | |
| 3-5 | 再次觸發 cron | 同一預約不重複發提醒 | | |

## 四、封鎖偵測——profile 前置檢查（驗收標準 6）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 4-1 | 手機上**封鎖**溫罐子 OA | — | | |
| 4-2 | /admin 對該會員觸發一筆推播（如再建預約） | 系統不中斷、建單正常 | | |
| 4-3 | 觀察手機 | **沒有**收到推播 | | |
| 4-4 | 查 profiles 表 | line_notify_blocked = true | | |
| 4-5 | 查 notifications_log | 該筆記錄原因為 profile_404、狀態為跳過 | | |
| 4-6 | 再觸發一次推播 | 直接跳過（log 可見），不再呼叫 profile API | | |

## 五、解封鎖恢復路徑（驗收標準 7）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 5-1 | 手機上**解除封鎖**溫罐子 OA | — | | |
| 5-2 | 開啟自建 LIFF 完成登入/綁定 | 流程成功 | | |
| 5-3 | 查 profiles 表 | line_notify_blocked 已清除（false/null） | | |
| 5-4 | 觸發一筆推播 | 手機**收到**，恢復正常 | | |
| 5-5 | 查 notifications_log | 該筆為成功 | | |

## 六、額度監控（驗收標準 5）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 6-1 | 開啟 /admin 日結報表 | 「LINE 訊息額度」區塊顯示本月已用/上限 | | |
| 6-2 | 與 manager.line.biz 後台的用量數字比對 | 兩邊一致（允許少量延遲差） | | |

## 七、夯客迴歸檢查（驗收標準 4）——與基準快照比對

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 7-1 | 傳訊息給溫罐子 OA | 夯客自動回覆正常，與基準一致 | | |
| 7-2 | 檢視 Rich Menu | 顯示與功能與基準一致 | | |
| 7-3 | 走一次夯客預約流程 | 夯客通知正常送達 | | |
| 7-4 | Console 唯讀檢視 Webhook URL | 與驗收前相同，未被更動 | | |
| 7-5 | **隔日**重複 7-1 ~ 7-3 | 全部正常 | 2026-07-21 完整營運日觀察，自動回覆／Rich Menu／夯客通知均與基準一致，無異常 | ✓ |

## 八、收尾

- [x] 全表結果回填，任何 ✗ 項目記錄現象與 log 摘要（全表無 ✗ 項）
- [x] 驗收結果落檔 docs/design-log.md（見 2026-07-20、2026-07-21 條目）
- [x] 通過後：Stage 6A-1 正式關閉，開啟 6A-2（電子同意書）設計草案排程
      （見 docs/design-log.md 2026-07-21 條目帳本登錄）
