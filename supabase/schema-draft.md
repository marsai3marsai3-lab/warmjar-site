# 溫罐子預約管理系統 — Supabase Schema 草案（Phase 1 設計文件）

> 狀態：**v2 final — 設計已凍結，尚未執行 migration**。7 個開放問題全部
> 定案，設計不再變動。等 Supabase 官方容量事件解除、`warmjar-dev` 專案
> 恢復 Healthy 後，直接依本文件切成實際的 `supabase/migrations/*.sql`
> 檔案執行。
>
> 分支：`feature/booking-system`
>
> **v2 更新歷程**：
> 1. 依第一輪審閱回饋定案 6 項設計決策 — `profiles` 改為雙軌身分
>    （LINE／Supabase Auth）、抽成改為逐筆結帳即時計算、新增
>    `revenue_records` 處理沒收定金、`checkout_items` 新增 `item_type`
>    保留擴充欄位、`customers` 新增 `last_visit_at` / `churn_risk_score`。
> 2. 補上第 7 題決策 — **`referral_records` 確定建表**，支援註冊自填
>    ＋人工配對，獎勵發放邏輯留到 Phase 5。

## 設計慣例

- 主鍵一律 `uuid default gen_random_uuid()`（需啟用 `pgcrypto` extension，
  Supabase 專案預設已啟用）。少數以自然鍵當主鍵的表（如
  `stored_value_accounts.customer_id`、`system_settings.key`）會特別註明。
- 所有表預設有 `created_at timestamptz default now()`；會被更新的表另有
  `updated_at timestamptz default now()`（由 trigger 維護）。
- **金額一律 `integer`，單位新台幣元，不用浮點數**（對應 CLAUDE.md 規則 5）。
- 時區固定 Asia/Taipei。預約時段用 `date` + `time`（不帶時區的當地時間）
  儲存人類看的班表，另外用 `generated column` 算出 `timestamptz` 供防重疊查詢
  使用（見「預約」章節說明）。
- 狀態一律用 `text` + `check` 約束模擬 enum（Supabase/Postgres 對 enum
  的 migration 較不彈性，改用 check constraint 方便未來增修狀態值）。
- 金流、儲值、抽成等敏感資料以「異動流水帳（ledger）」為唯一真實來源，
  彙總表（如 `stored_value_accounts`）視為可重算的快取。
- 刪除一律用 `status` 軟刪除，不做實體刪除，以利對帳與 `audit_logs` 追溯。

## 身分與登入策略（v2 新增）

- **客人端（`/book`、`/member`）完全靠 LINE LIFF**，不建立 Supabase Auth 帳號。
  伺服器端驗證 LIFF ID Token 後，自行簽發 session（httpOnly cookie），
  API／Server Action 用 **service-role client** 執行，authorization 邏輯
  寫在應用層，不倚賴 Postgres RLS 的 `auth.uid()`。
- **內部人員端（`/admin`、`/staff`）走 Supabase Auth** 帳號密碼／magic link
  登入，可以正常使用 `auth.uid()` 搭配 RLS 政策。
- 因此 `profiles` 表設計成雙軌：`auth_user_id`（內部人員）與
  `line_user_id`（客人）兩欄位互斥使用，角色決定要填哪一欄。

## 高層級關聯總覽

```
profiles（雙軌身分：auth_user_id=內部人員／line_user_id=客人，role 判斷權限）
   │
   ├─→ customers（CRM 詳細資料，profile_id 可為 NULL＝尚未綁定 LINE 的電話/現場客人）
   │        │
   │        ├─→ appointments ──→ checkouts ──→ checkout_items ──→ commission_records
   │        │        │                │              │
   │        │        ↓                ↓              ↓
   │        │   deposit_records   stored_value_*   staff / service_variants
   │        │        │
   │        │        └─(forfeited)─→ revenue_records（獨立營收，不產生抽成）
   │        │
   │        ├─→ stored_value_accounts ──→ stored_value_transactions
   │        ├─→ loyalty_points_accounts ──→ loyalty_points_transactions
   │        ├─→ coupon_redemptions
   │        └─→ scheduled_notifications ──→ notification_logs
   │
   └─→ staff（profile_id 必填，對應 /staff 登入帳號）

audit_logs 記錄所有敏感操作（結帳、退費、儲值餘額調整、會員資料修改）
```

---

## 1. 會員（Members）

### `customers`
顧客 CRM 主檔。`profile_id` 可為 NULL（電話代訂／現場登記、尚未綁定 LINE 的客人）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles(id), UNIQUE, NULL | 綁定 LINE 後才會有值 |
| name | text NOT NULL | |
| phone | text UNIQUE, NULL | |
| email | text NULL | |
| gender | text NULL | |
| birthday | date NULL | |
| source | text NULL | LINE／官網／現場／轉介／其他 |
| internal_note | text NULL | 師傅備忘（體質、禁忌等），僅後台可見 |
| status | text NOT NULL DEFAULT 'active' | active / blacklisted / inactive |
| last_visit_at | timestamptz NULL | **v2 新增**：最近一次到店結帳時間，Phase 5 行銷自動化的資料來源 |
| churn_risk_score | numeric(5,2) NULL | **v2 新增**：流失風險分數，欄位先保留，計算邏輯排到 Phase 5（LINE 整合）再做 |
| created_at / updated_at | timestamptz | |

> 「誰介紹了這位客人」不在 `customers` 表上重複記錄，統一由
> `referral_records`（見「行銷」章節）維護，避免兩處資料互相打架。

### `tags` / `customer_tags`
顧客標籤（例如 VIP、久坐族群），多對多。

| 表 | 欄位 |
|---|---|
| `tags` | id uuid PK, name text UNIQUE NOT NULL, color text NULL |
| `customer_tags` | customer_id FK→customers(id), tag_id FK→tags(id), created_at；PK(customer_id, tag_id) |

---

## 2. 服務與資源（Services & Resources）

### `service_categories`
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| name | text NOT NULL |
| sort_order | int DEFAULT 0 |

### `services`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| category_id | uuid FK→service_categories(id) | |
| name | text NOT NULL | 服務名稱以既有價目表為準 |
| description | text NULL | |
| is_active | boolean DEFAULT true | |
| compliance_reviewed | boolean DEFAULT false | 文案是否已自查排除醫療效能宣稱（CLAUDE.md 規則 4） |
| sort_order | int DEFAULT 0 | |
| created_at / updated_at | timestamptz | |

### `service_variants`
一項服務可能有多種時長／價格（例如 60 / 90 / 120 分鐘），抽成與結帳一律指向 variant，不指向 service。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| service_id | uuid FK→services(id) | |
| name | text NOT NULL | 例如「90分鐘」 |
| duration_minutes | int NOT NULL | 供可用性計算使用 |
| face_value_price | int NOT NULL | 面額價格（NTD），抽成計算依據 |
| is_active | boolean DEFAULT true | |
| sort_order | int DEFAULT 0 | |

### `staff`
師傅／員工的營運資料。**`profile_id` 必填**，因為所有師傅都需要 `/staff` 登入權限（走 Supabase Auth）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles(id), UNIQUE NOT NULL | 對應 profiles.auth_user_id 登入身分 |
| name | text NOT NULL | |
| phone | text UNIQUE, NULL | |
| hire_date | date NULL | |
| default_commission_rate | numeric(5,2) NOT NULL | 例如 40.00 代表 40% |
| status | text NOT NULL DEFAULT 'active' | active / leave / resigned |
| created_at / updated_at | timestamptz | |

### `staff_service_skills`
| 欄位 | 型別 | 說明 |
|---|---|---|
| staff_id | FK→staff(id) | |
| service_id | FK→services(id) | |
| commission_rate_override | numeric(5,2) NULL | 若該師傅對此服務有特別抽成% |
| can_perform | boolean DEFAULT true | 供可用性計算篩選候選師傅 |
| PK | (staff_id, service_id) | |

### `rooms`
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| name | text NOT NULL |
| capacity | int DEFAULT 1 |
| is_active | boolean DEFAULT true |

### `staff_recurring_availability`（樣板班表）
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| staff_id | FK→staff(id) |
| weekday | int NOT NULL（0=日...6=六） |
| start_time / end_time | time NOT NULL |
| is_active | boolean DEFAULT true |

### `staff_schedules`（實際每日班表：由樣板產生，可手動調整/請假）
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| staff_id | FK→staff(id) |
| work_date | date NOT NULL |
| start_time / end_time | time NULL（請假時為 NULL） |
| is_day_off | boolean DEFAULT false |
| note | text NULL |
| UNIQUE | (staff_id, work_date) |

> **可用性計算（找空檔）的資料來源**：`staff_schedules`（當日班表）
> − `appointments`（已占用時段，status 排除 cancelled/no_show）
> − `holidays`（公休日）。純函式輸入這三者即可推導空檔，不應在
> DB 內用觸發器計算，以符合 CLAUDE.md「可用性計算必須是純函式並有單元測試」。

---

## 3. 預約（Bookings）

### `appointments`
一筆預約 = 一位顧客＋一個 service_variant＋一個時段（多服務需求會產生多筆
`appointments`，結帳時再用 `checkout_items` 彙整成一次結帳；**同一次結帳只
彙整同一次到店的預約，不跨天合併**，見「已定案的設計決策」第 5 點）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| customer_id | FK→customers(id) | |
| service_variant_id | FK→service_variants(id) | |
| staff_id | FK→staff(id), NULL | 允許先不指定師傅 |
| room_id | FK→rooms(id), NULL | |
| appointment_date | date NOT NULL | |
| start_time / end_time | time NOT NULL | Asia/Taipei 當地時間 |
| start_at / end_at | timestamptz GENERATED ALWAYS AS `(appointment_date + start_time) AT TIME ZONE 'Asia/Taipei'` STORED | 供防重疊查詢用 |
| status | text NOT NULL DEFAULT 'pending' | pending / confirmed / completed / cancelled / no_show |
| source | text NOT NULL | line / phone / walk_in / admin / web |
| customer_note | text NULL | |
| internal_note | text NULL | |
| created_by | FK→profiles(id), NULL | 前台代客建立時記錄操作者 |
| cancelled_at | timestamptz NULL | |
| cancel_reason | text NULL | |
| created_at / updated_at | timestamptz | |

> 建議加 `EXCLUDE USING gist (staff_id WITH =, tsrange(start_at, end_at) WITH &&)
> WHERE (status NOT IN ('cancelled','no_show'))` 防止同一師傅時段重疊
> （需啟用 `btree_gist` extension）。這是 DB 層的最後防線，實際判斷空檔
> 仍以應用層純函式為主。

### `appointment_status_history`
狀態變更留痕，也是分析 no-show 率的資料來源（呼應 CLAUDE.md 提醒策略的營運洞察）。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| appointment_id | FK→appointments(id) |
| old_status / new_status | text |
| changed_by | FK→profiles(id), NULL |
| reason | text NULL |
| changed_at | timestamptz DEFAULT now() |

---

## 4. 定金與儲值（Deposits & Stored Value）

### `stored_value_plans`
三階儲值方案主檔。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| tier | text NOT NULL（暖心 / 沐光 / 御藏） |
| name | text NOT NULL |
| principal_amount | int NOT NULL |
| bonus_amount | int NOT NULL DEFAULT 0 |
| is_active | boolean DEFAULT true |
| sort_order | int DEFAULT 0 |

### `stored_value_accounts`
每位顧客一個彙總帳戶（快取，真實來源是下面的流水帳）。

| 欄位 | 型別 |
|---|---|
| customer_id | uuid PK, FK→customers(id) |
| principal_balance | int NOT NULL DEFAULT 0 |
| bonus_balance | int NOT NULL DEFAULT 0 |
| updated_at | timestamptz |

### `stored_value_topup_orders`
儲值購買訂單（串 ECPay 金流）。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| customer_id | FK→customers(id) |
| plan_id | FK→stored_value_plans(id) |
| principal_amount / bonus_amount | int NOT NULL |
| payment_method | text NOT NULL |
| ecpay_trade_no | text NULL |
| status | text DEFAULT 'pending'（pending/paid/failed/refunded） |
| paid_at | timestamptz NULL |
| created_at | timestamptz |

### `stored_value_transactions`（流水帳，唯一真實來源）
本金／贈額分開記帳，退費只退本金（CLAUDE.md 規則 2）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| account_customer_id | FK→stored_value_accounts(customer_id) | |
| type | text NOT NULL | topup / consume / refund / adjustment |
| principal_delta | int NOT NULL DEFAULT 0 | |
| bonus_delta | int NOT NULL DEFAULT 0 | refund 類型此欄位必為 0 或負 |
| related_topup_order_id | FK→stored_value_topup_orders(id), NULL | |
| related_checkout_id | FK→checkouts(id), NULL | |
| operator_id | FK→profiles(id), NULL | |
| note | text NULL | |
| created_at | timestamptz | |

### `deposit_records`
預約定金（與儲值分開，定金綁在單一預約上）。沒收（forfeited）時會在
`revenue_records` 產生一筆獨立營收，見下方說明。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| appointment_id | FK→appointments(id) |
| amount | int NOT NULL |
| payment_method | text NOT NULL |
| ecpay_trade_no | text NULL |
| status | text DEFAULT 'pending'（pending/paid/refunded/forfeited） |
| paid_at / refunded_at | timestamptz NULL |
| note | text NULL |
| created_at | timestamptz |

---

## 5. 結帳與抽成（Checkout & Commission）

### `checkouts`
一次到店結帳（可能涵蓋**同一次到店**的多筆 `appointments`／多項服務；
**不支援跨天合併結帳**，見「已定案的設計決策」第 5 點）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| customer_id | FK→customers(id) | |
| checked_out_by | FK→profiles(id), NULL | |
| checkout_at | timestamptz DEFAULT now() | |
| subtotal_face_value | int NOT NULL | 各項目面額加總 |
| total_paid_amount | int NOT NULL | 客人實付總額 |
| discount_amount | int NOT NULL DEFAULT 0 | |
| deposit_applied | int NOT NULL DEFAULT 0 | |
| stored_value_principal_used | int NOT NULL DEFAULT 0 | |
| stored_value_bonus_used | int NOT NULL DEFAULT 0 | |
| payment_method | text NOT NULL | cash / ecpay_credit / ecpay_transfer / stored_value / mixed |
| invoice_status | text DEFAULT 'not_requested' | not_requested/requested/issued/void |
| ecpay_trade_no | text NULL | |
| status | text DEFAULT 'completed' | completed/voided/refunded |
| void_reason | text NULL | |
| created_at | timestamptz | |

> 完成後應用層須更新對應 `customers.last_visit_at`（見會員章節 v2 新增欄位）。

### `checkout_items`
每一項目的明細，**同時保存 face_value 與 paid_amount**（CLAUDE.md 規則 1 的核心落地）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| checkout_id | FK→checkouts(id) | |
| item_type | text NOT NULL DEFAULT 'service' | **v2 新增**：service / product。目前只會寫入 'service'，為未來零售商品模組保留（見決策第 4 點） |
| appointment_id | FK→appointments(id), NULL | 對應到哪一筆預約（同一次到店） |
| service_variant_id | FK→service_variants(id), NULL | item_type='service' 時必填；product 類型待未來模組擴充 |
| staff_id | FK→staff(id), NULL | 實際服務的師傅（可能與 appointment 指定的不同）；product 類型可為 NULL |
| face_value | int NOT NULL | 快照當下面額，抽成依據 |
| paid_amount | int NOT NULL | 快照客人實際分攤金額 |
| quantity | int NOT NULL DEFAULT 1 | |
| created_at | timestamptz | |

### `commission_records`
**抽成於結帳當下逐筆計算並四捨五入至整數元**，不等到月結才算
（見「已定案的設計決策」第 2 點）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| checkout_item_id | FK→checkout_items(id), UNIQUE | |
| staff_id | FK→staff(id) | |
| commission_rate | numeric(5,2) NOT NULL | |
| commission_amount | int NOT NULL | = `round(face_value × rate)`，結帳當下算好；**永遠以 face_value 計算，與 paid_amount 無關** |
| settlement_batch_id | FK→commission_settlement_batches(id), NULL | |
| settled | boolean DEFAULT false | |
| settled_at | timestamptz NULL | |
| created_at | timestamptz | |

### `commission_settlement_batches`
月結／週結批次，**純粹是把已經算好的 `commission_records` 分組標記為已請款／已發放，
不重新計算金額**，供對帳發薪使用。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| staff_id | FK→staff(id) |
| period_start / period_end | date NOT NULL |
| total_commission_amount | int NOT NULL DEFAULT 0 |
| status | text DEFAULT 'draft'（draft/confirmed/paid） |
| confirmed_at / paid_at | timestamptz NULL |
| created_at | timestamptz |

### `revenue_records`（**v2 新增**）
非服務抽成類的獨立營收紀錄，目前唯一用途是「沒收定金」。**此表與
`commission_records` 完全無關，沒收的定金不計入任何師傅的抽成基礎**
（見「已定案的設計決策」第 3 點）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| revenue_type | text NOT NULL | 目前僅 `forfeited_deposit`；欄位設計上可擴充其他非服務營收類型 |
| amount | int NOT NULL | |
| source_table | text NOT NULL | 例如 `'deposit_records'` |
| source_id | uuid NOT NULL | 對應 `deposit_records.id` |
| customer_id | FK→customers(id), NULL | 供報表追溯 |
| recorded_by | FK→profiles(id), NULL | |
| note | text NULL | |
| recorded_at | timestamptz DEFAULT now() | |

> 應用層邏輯：當 `deposit_records.status` 改為 `'forfeited'` 時，同一個交易
> 內寫入一筆 `revenue_records`（`revenue_type='forfeited_deposit'`），
> **不**產生 `checkout_items` / `commission_records`。財報上「服務業績」與
> 「沒收定金營收」分開兩欄統計。

---

## 6. 行銷（Marketing）

### `coupons` / `coupon_redemptions`
| 表 | 主要欄位 |
|---|---|
| `coupons` | id, code UNIQUE, name, discount_type(fixed/percentage), discount_value int, min_spend int NULL, max_discount_amount int NULL, valid_from/valid_until timestamptz NULL, usage_limit_total int NULL, usage_limit_per_customer int DEFAULT 1, is_active, created_at |
| `coupon_redemptions` | id, coupon_id FK, customer_id FK, checkout_id FK NULL, redeemed_at |

### `loyalty_points_accounts` / `loyalty_points_transactions`
| 表 | 主要欄位 |
|---|---|
| `loyalty_points_accounts` | customer_id PK/FK, balance int DEFAULT 0, updated_at |
| `loyalty_points_transactions` | id, account_customer_id FK, delta int, reason(earn_checkout/redeem/expire/manual_adjust), related_checkout_id FK NULL, operator_id FK NULL, created_at |

### `referral_records`（**v2 final 定案：本階段建表**）
本階段只建表與記錄「誰介紹誰」的關係，**介紹獎勵的自動發放邏輯不實作**，
排到 Phase 5 與票券／LINE 通知一起做（`reward_*` 欄位先保留、不使用）。

顧客註冊流程會加一個「選填」欄位讓客人自填介紹人（手機號或姓名），
此時還不知道確切是哪一位既有顧客，所以 `referrer_customer_id` 允許
NULL，原始輸入存在 `referrer_input_raw`，等後台人工核對後才回填
`referrer_customer_id` 並將 `match_status` 改為 `matched`。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| referred_customer_id | FK→customers(id), UNIQUE | 被介紹的客人，一人僅一筆介紹紀錄 |
| referrer_customer_id | FK→customers(id), NULL | 配對成功後才有值 |
| referrer_input_raw | text NULL | 客人註冊時自填的介紹人手機號／姓名（配對前的原始輸入） |
| source | text NOT NULL | self_registration（客人註冊自填）／manual_backfill（店家手動補登） |
| match_status | text NOT NULL DEFAULT 'pending' | pending（尚未比對）／matched（已配對）／unmatched（人工確認查無此人） |
| matched_by | FK→profiles(id), NULL | 人工確認配對的操作者 |
| matched_at | timestamptz NULL | |
| reward_status | text NOT NULL DEFAULT 'not_applicable' | 保留給 Phase 5：not_applicable／pending／issued |
| reward_type | text NULL | 保留給 Phase 5 |
| reward_amount | int NULL | 保留給 Phase 5 |
| reward_issued_at | timestamptz NULL | 保留給 Phase 5 |
| created_at | timestamptz | |

---

## 7. 通知與提醒（Notifications & Reminders）

落實 CLAUDE.md 規則 3：不做「當日預約當日提醒」，採「隔日回訪 + 前一日提醒」。

### `reminder_rules`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| trigger_type | text NOT NULL | day_before_appointment / post_visit_followup |
| offset_days | int NOT NULL | |
| offset_hours | int NOT NULL DEFAULT 0 | |
| channel | text NOT NULL | line / sms |
| message_template | text NOT NULL | |
| is_active | boolean DEFAULT true | |

### `scheduled_notifications`
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| rule_id | FK→reminder_rules(id), NULL |
| appointment_id | FK→appointments(id), NULL |
| customer_id | FK→customers(id) |
| channel | text NOT NULL |
| scheduled_at | timestamptz NOT NULL |
| status | text DEFAULT 'pending'（pending/sent/failed/cancelled） |
| sent_at | timestamptz NULL |
| error_message | text NULL |
| created_at | timestamptz |

### `notification_logs`
| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| scheduled_notification_id | FK→scheduled_notifications(id), NULL |
| customer_id | FK→customers(id) |
| channel | text NOT NULL |
| content_snapshot | text NOT NULL |
| line_message_id | text NULL |
| status | text NOT NULL（sent/failed） |
| sent_at | timestamptz |

---

## 8. 其他／系統（Other / System）

### `profiles`（**v2 改版：雙軌身分**）
全站唯一的身分表。角色決定要填哪一種登入身分：
`owner` / `manager` / `staff` 走 `auth_user_id`（Supabase Auth）；
`customer` 走 `line_user_id`（LINE LIFF，不建立 Supabase Auth 帳號）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | 自行產生，不強制等於 auth.users.id |
| role | text NOT NULL | owner / manager / staff / customer |
| auth_user_id | uuid FK→auth.users(id), UNIQUE, NULL | 內部人員（owner/manager/staff）登入用 |
| line_user_id | text UNIQUE, NULL | 客人（customer）LIFF 身分 |
| display_name | text NULL | |
| phone | text NULL | |
| avatar_url | text NULL | |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

> 應用層規則（非 DB 強制）：`role IN ('owner','manager','staff')` 時
> `auth_user_id` 必填；`role = 'customer'` 時 `line_user_id` 必填。
> `/admin`、`/staff` 的 RLS 政策用 `auth.uid()` 對應 `profiles.auth_user_id`；
> `/book`、`/member` 的存取控制在應用層（service-role client + 已驗證的
> LIFF 身分）處理，不倚賴 RLS。

### `audit_logs`
所有敏感操作（結帳、退費、儲值餘額調整、會員資料修改）一律寫入（CLAUDE.md 開發紀律）。

| 欄位 | 型別 |
|---|---|
| id | uuid PK |
| actor_id | FK→profiles(id), NULL |
| action | text NOT NULL（例如 'checkout.create'、'stored_value.adjust'） |
| target_table | text NOT NULL |
| target_id | uuid NULL |
| before / after | jsonb NULL |
| created_at | timestamptz |

### `system_settings`
| 欄位 | 型別 |
|---|---|
| key | text PK |
| value | jsonb NOT NULL |
| updated_at | timestamptz |
| updated_by | FK→profiles(id), NULL |

### `business_hours` / `holidays`
| 表 | 主要欄位 |
|---|---|
| `business_hours` | weekday int PK(0-6), open_time/close_time time NULL, is_closed boolean DEFAULT false |
| `holidays` | holiday_date date PK, reason text NULL, is_closed boolean DEFAULT true |

---

## 已定案的設計決策（v2 final — 7 題全數定案，設計凍結）

1. **LINE Login 為主**：客人端 `/book`、`/member` 完全靠 LIFF，`profiles.line_user_id`
   存客人身分；Supabase Auth 僅用於 `/admin`、`/staff` 內部人員登入
   （`profiles.auth_user_id`）。→ `profiles` 改為雙軌身分表，`customers`／`staff`
   的登入欄位改為 `profile_id` 外鍵。
2. **抽成逐筆結帳時計算**，四捨五入到整數元，不等月結才算。→
   `commission_records.commission_amount` 於結帳當下寫入；
   `commission_settlement_batches` 只負責分組請款，不重新計算。
3. **定金沒收時記一筆獨立營收**（`revenue_type = 'forfeited_deposit'`），
   與正常服務業績分開統計，且不產生抽成記錄。→ 新增 `revenue_records` 表。
4. **目前不支援零售商品完整模組**（不做商品管理／進貨／庫存），但
   `checkout_items` 保留 `item_type` 欄位（service/product）以便未來擴充。
5. **不支援跨天合併結帳**，一次結帳對應一次到店服務；分次扣款需求
   由儲值扣款機制處理。→ `checkouts`／`checkout_items` 語意明確限定為
   單次到店。
6. **行銷轉冷的自動判斷邏輯先不建**，但在 `customers` 表預留
   `last_visit_at`、`churn_risk_score` 欄位，實際自動化規則排到
   Phase 5（LINE 整合）再做。
7. **`referral_records` 確定建表**：本階段只建表與記錄關係
   （`referrer_customer_id`、`referred_customer_id`、建立時間、來源、
   狀態、獎勵發放記錄欄位先留空）；客人註冊流程加一個選填的「介紹人」
   欄位（手機號或姓名），後台可人工確認配對；介紹獎勵的自動發放邏輯
   排到 Phase 5 與票券／LINE 通知一起做。→ `referral_records` 新增
   `referrer_input_raw`／`source`／`match_status`／`matched_by`／
   `matched_at` 及保留的 `reward_*` 欄位；`customers.referrer_customer_id`
   移除，統一由 `referral_records` 維護介紹關係。

**下一步**：等你確認 Supabase 官方容量事件解除、`warmjar-dev` 恢復
Healthy，即可直接依本文件切成 `supabase/migrations/0001_init.sql`
（或依類別拆成多檔）執行，不再回頭改設計。
