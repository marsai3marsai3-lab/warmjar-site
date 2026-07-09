# Phase 3-3：會員管理（/admin/members）— 設計草案

> 狀態：**草案，待確認** — 本檔案只描述頁面結構與資料來源，尚未實作。
> 確認後刪除本行、把「狀態」改成「已定案 YYYY-MM-DD」，並在
> [design-log.md](design-log.md) 補一筆摘要。

## 0. 現有 schema 盤點（動工前先核對假設）

繼續實作前，先確認下面這些「已經有」跟「還沒有」的判斷跟你的認知
一致：

**已經有，可以直接用：**
- `customers`：`birthday` / `status`（`active` / `blacklisted` /
  `inactive`，CHECK 已在 DB）/ `source` / `internal_note` /
  `last_visit_at` / `churn_risk_score` / `profile_id`。
- `tags` / `customer_tags`：多對多標籤表已建。
- `profiles.role`：CHECK 已允許 `'owner','manager','staff','customer'`
  ——**DB 層 owner/manager 分流的地基已經在**，本階段要做的是應用層
  第一次真正依 role 擋權限（目前 `requireAdminForAction` 只檢查
  email 白名單，不分角色）。
- `deposit_records.status`：CHECK 已含 `'refunded'`、`refunded_at`
  欄位也已存在，只是還沒有任何 admin action 會把它寫成這個值——
  C.2「退款標記」不需要新增欄位，只需要新增一個 action。
- `evaluateDepositPolicy()` / `fetchCustomerDepositHistory()`
  （`src/lib/booking/depositPolicy.ts`、`depositHistory.ts`）：現成
  的「這位客人目前要不要收訂金」判斷邏輯，會員詳情頁直接呼叫，不
  重造一套。

**還沒有，本階段要新增：**
- `customers.rating`：內部評分（1-5）欄位不存在，需要 migration。
- `member_notes` 表：服務紀錄（師傅調理筆記）完全沒有對應的表。
- Supabase Storage：專案目前**完全沒有**接 Storage（`grep` 全專案
  找不到任何 `.storage.` 呼叫），照片上傳是从零開始接。
- owner-only 權限檢查的 helper 函式（`requireAdminForAction` 之外
  再加一層 role 檢查）。

**資料缺口（會影響列表頁能不能顯示真實數字，需要你決定）：**
- `last_visit_at` 欄位存在，但目前**沒有任何程式碼寫入它**——結帳
  流程（`checkouts`/`checkout_items` 表已建但功能還沒做）才是預計
  的寫入來源。在結帳 phase 上線前，我建議「最後來店」先用
  `MAX(appointments.appointment_date) WHERE status='completed'`
  即時算，上線後再切換成結帳寫入的 `last_visit_at`，並在
  design-log 記錄這個切換點，避免兩個 phase 之間有人忘記切換。
- 「累計消費」需要 `checkouts` 的真實 `paid_amount` 才有意義，結帳
  功能還沒做。三個選項，**要你選一個**：
  1. 先顯示「N/A（尚未結帳上線）」，等結帳 phase 一起做。
  2. 用 completed 預約的服務面額（face_value）加總當**估算值**，
     UI 上明確標「估算」二字。缺點：跟 CLAUDE.md 規則 1（抽成看
     face_value、營收看實付）的精神有點衝突，容易被誤讀成真實營收。
  3. 兩者都不做，這欄位本階段直接不放進列表（等結帳 phase 再補）。
  →**我的建議是選項 1**：顯眼地標「N/A」比顯示一個看起來像真數字
  但其實是估算值更不容易誤導老闆或店員做營運判斷。
- 「爽約次數」沒有快取欄位。列表頁如果對每一列各打一次 API 算爽約
  次數（N+1 查詢），客人一多會很慢。建議改用一次性的
  `GROUP BY customer_id` 聚合查詢，列表頁載入時一次拿齊所有人的
  爽約次數，不逐列查。

## A. 會員列表頁 `/admin/members`

### 搜尋
沿用 `CustomerSearchField` 的 debounce（300ms）與最小長度規則
（電話前綴 ≥4 碼、姓名 ≥2 字），但這裡是「列表頁本身的主搜尋」而
不是 autofill 用的下拉選單——輸入後直接重新渲染整個列表，不用彈出
式候選清單那套 UI。

### 篩選（可疊加，AND 邏輯）
| 篩選項 | 資料來源 | 備註 |
|---|---|---|
| 標籤 | `customer_tags` 多選 | |
| 最後來店日區間 | 見上方資料缺口說明 | |
| 本月壽星 | `birthday` 月份 = 當月（Asia/Taipei） | |
| 有無爽約紀錄 | **語意待確認，見 E.3** | |
| 黑名單 | `customers.status = 'blacklisted'` | |

### 列表欄位
姓名、手機、標籤（pill）、最後來店、累計消費、爽約次數——顯示規則
依上方資料缺口決議。

### 互動
點一列 → 導頁到 `/admin/members/[id]`（不做成側滑面板，因為詳情頁
資訊量大，比照獨立頁面而不是 `AppointmentDetailPanel` 那種
slide-over）。

## B. 會員詳情頁（會員護照）`/admin/members/[id]`

### 版面（手機優先，比照現有 `/admin` 其他頁的直向捲動＋底部 Tab 慣例）

```
┌─────────────────────────────────────────┐
│ ← 返回              王小美          [⋮]  │  頭部：返回、姓名、
├─────────────────────────────────────────┤  overflow menu（黑名單
│ 📞 0912-345-678                          │  切換／評分編輯，
│ 🏷 VIP、久坐族群                          │  owner 限定才看得到）
│ 🎂 03/15（本月壽星）  來源：官方LINE       │
│ 狀態： ● 正常                             │  manager 看到的狀態
│ （owner 才看得到「切換黑名單」按鈕）        │  唯讀，owner 才有切換鈕
│ （owner 才看得到「內部評分 ★★★★☆」）      │
├─────────────────────────────────────────┤
│ [基本資料] [預約歷史] [訂金/爽約] [服務紀錄] │  分頁 Tab
├─────────────────────────────────────────┤
│                                           │
│           （分頁內容，見下）               │
│                                           │
└─────────────────────────────────────────┘
```

### Tab 1／基本資料
- 可編輯欄位：姓名、生日、備註（`internal_note`）、標籤（多選編輯器，
  可新增現有標籤或建立新標籤）。
- 存檔走 Server Action，寫 `audit_logs`（`admin.member.update_profile`）。
- 黑名單切換與內部評分**不放在這個 tab 裡編輯**，集中在頭部的
  owner-only overflow menu——manager 進來這頁時，這兩個控制項要
  整個不渲染（不是 disabled 灰階，是不出现在 DOM 裡），避免從
  devtools 就能看到欄位存在。

### Tab 2／預約歷史
- 跨日期列出這位客人的所有預約（不限日期範圍，分頁載入），依時間
  倒序。
- 每列：日期時間、服務項目、師傅、狀態 pill（沿用既有
  `STATUS_LABEL`/`STATUS_BLOCK_STYLE`）、來源（沿用
  `SOURCE_OPTIONS` 的 label，含 3-2 新增的 `line_oa`/`instagram`）。
- 非終態的預約（`confirmed`/`pending`/`pending_deposit`）列後面放
  「改期/換師傅」按鈕，對應 C.1。

### Tab 3／訂金與爽約
- 頂部卡片：呼叫既有 `evaluateDepositPolicy()` + `fetchCustomerDepositHistory()`，
  顯示「目前是否需付訂金」與判定原因（`in_good_standing` /
  `flagged_no_show` / `flagged_late_cancellation` / `no_history`），
  直接沿用 `DepositReason` 既有的四種語意，不新造一套文案。
- no_show 歷史列表：日期、對應服務。
- 訂金紀錄列表：金額、狀態 pill（沿用 `DEPOSIT_STATUS_LABEL`）、
  付款/免收/沒收時間、備註。狀態為 `paid` 的紀錄後面放「退款標記」
  按鈕，對應 C.2（owner 限定，manager 看不到這個按鈕）。

### Tab 4／服務紀錄（`member_notes`，新表）
- 列表：日期、記錄的師傅／店員、筆記內容、照片縮圖區。
- 新增筆記表單：文字框（必填）+ 照片上傳按鈕。
- **照片上傳本階段先做「灰階佔位＋disabled + tooltip『即將推出』」**，
  不接 Supabase Storage——見 E.1 我的建議與理由。
- `member_notes` 表草案（尚未落 migration，等你確認後才寫）：
  ```sql
  CREATE TABLE public.member_notes (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    note         text NOT NULL,
    photo_urls   text[] NOT NULL DEFAULT '{}', -- 先留欄位，Storage 串接見 E.1
    created_at   timestamptz NOT NULL DEFAULT now()
  );
  ```

## C. 補齊 3-2 缺口

### C.1 改期/換師傅
- 入口：預約詳情面板（`AppointmentDetailPanel`）與會員詳情頁 Tab 2
  都要能觸發。
- 走既有 `fetchAvailabilityInput` + `calculateAvailability` 同一套
  防撞單檢查（跟手動建單、`/book` 送出前重新驗證共用邏輯，不重造）。
- 寫 `audit_logs`（`admin.appointment.reschedule`），`before`/`after`
  記錄原時段與新時段（含師傅）。
- 邊界情況：改期後新時段若剛好被別人搶走，要回傳明確錯誤，不能悄悄
  失敗——沿用 `createAppointmentRepository` 現有的 409 衝突處理模式。

### C.2 退款標記
- 只在 `deposit_records.status = 'paid'` 的紀錄上可觸發。
- 動作：`status → 'refunded'`、`refunded_at = now()`、`note` 記錄
  操作原因，**不呼叫 ECPay 退款 API**（維持人工作業）。
- owner 限定（見 D 權限矩陣）。
- 寫 `audit_logs`（`admin.deposit.mark_refunded`）。
- **必須在使用者可見的地方明確標註「金流退款目前為人工作業，本按鈕
  只更新紀錄狀態，實際退款請另外操作 ECPay 後台」**——這是你在需求
  裡特別交代要記明的事，UI 文案跟這份文件都要寫到，避免店員以為按
  了這顆按鈕客人就自動收到退款。

## D. 權限矩陣

| 操作 | manager | owner |
|---|---|---|
| 查看會員列表／詳情 | ✅ | ✅ |
| 編輯基本資料／標籤 | ✅ | ✅ |
| 新增服務紀錄 | ✅ | ✅ |
| 改期/換師傅 | ✅ | ✅ |
| 黑名單切換 | ❌ | ✅ |
| 內部評分編輯 | ❌ | ✅ |
| 退款標記 | ❌ | ✅ |

- 新增 `requireOwnerForAction()`（包在 `requireAdminForAction()`
  外面多檢查 `profile.role === 'owner'`），owner-limited 的 Server
  Action 一律用它，不是在 UI 層藏按鈕就算了事（manager 直接呼叫
  Server Action 也要被擋）。
- 黑名單效果（呼應你的需求 B.4）：黑名單開啟時，`/book` 查詢一律
  回「無可預約時段」，**不回專屬錯誤訊息或 403**——要在既有的
  availability 查詢路徑最前面加一個黑名單短路判斷，回傳跟「這天真
  的沒空檔」完全相同的回應形狀，前端無法區分兩者。

## E. 待你決定的問題

### E.1 照片上傳
我的建議：**這階段只做 UI 佔位，不接 Supabase Storage**，理由：
1. 這是按摩調理業務，服務紀錄照片可能涉及顧客身體部位，屬於敏感
   個資——上傳前應該先確定「誰看得到」（只有記錄的師傅本人？全體
   員工？owner 才能看？）、保留期限、要不要顧客同意，這幾件事現在
   都還沒定案，接了 Storage 之後才發現要重做存取控制會比較麻煩。
2. 專案目前完全沒有 Storage bucket、RLS policy、簽名 URL 這套基礎
   建設，是從零開始接，工作量不小，值得單獨排一個小任務而不是塞進
   會員管理這個已經很大的 phase 裡。
3. `member_notes.photo_urls text[]` 欄位先留著，之後接 Storage 時
   只是「把上傳按鈕從 disabled 變成真的能傳」＋補 RLS，不需要改
   資料結構或前面已經做好的列表/表單 UI。

若你要現在就接，麻煩先回答：誰看得到照片（見上）、要不要顧客同意、
保留多久，我再依答案設計 Storage bucket 的存取層級。

### E.2 累計消費算法
見「0. 現有 schema 盤點」——我建議選項 1（先顯示 N/A），等你確認。

### E.3 「有無爽約紀錄」篩選語意
兩種可能，語意不同：
1. **歷史上是否曾經爽約過**（單純查 `appointments.status='no_show'`
   是否存在過任一筆）。
2. **目前是否處於「需付訂金」限制狀態**（呼叫
   `evaluateDepositPolicy`，`reason='flagged_no_show'`）——這個口徑
   會排除「爽約過一次，但後來已完成一次預約、資格已恢復」的客人。
   我猜你要的是這個，因為這樣篩選結果才跟訂金政策一致（篩出來的人
   就是「/book 現在會要求他付訂金」的那批人），但麻煩你確認一下，
   兩種語意都合理，只是回答的問題不一樣。

## F. 測試計畫（91 案不得變紅，新邏輯要補新案）

- 黑名單封鎖：`/book` 對黑名單客人的可用時段查詢，回應要跟「這天
  真的沒空檔」完全無法區分（不是回 403、不是回特殊錯誤訊息）。
- 權限邊界：manager 呼叫黑名單切換／內部評分編輯／退款標記三個
  owner-limited action 要被拒絕；owner 呼叫要成功。
- 改期/換師傅：重跑 availability 檢查、寫入前防撞單，比照現有
  `create-appointment` 的併發衝突測試模式（含 409 SLOT_ALREADY_BOOKED）。
- 退款標記：只允許從 `paid` 轉 `refunded`，其他來源狀態要擋（例如
  已經 `refunded` 或 `waived` 的不能再標退款）。
- `evaluateDepositPolicy`／`fetchCustomerDepositHistory` 純函式部分
  已有既有測試覆蓋，會員詳情頁只是呼叫既有邏輯，不重複測試核心規則，
  但要測「呼叫串接正確」（傳對 customerId、UI 顯示對應到正確的
  `DepositReason`）。
