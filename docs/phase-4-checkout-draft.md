# Phase 4：結帳（POS）與抽成系統 — 設計草案

> 狀態：**草案，待確認** — 本檔案只描述流程、頁面結構、資料結構與狀態機，
> 尚未實作。確認後刪除本行、把「狀態」改成「已定案 YYYY-MM-DD」，並在
> [design-log.md](design-log.md) 補一筆摘要。

## 0. 現有 schema 盤點

好消息：`checkouts` / `checkout_items` / `commission_records` /
`commission_settlement_batches` / `revenue_records` 五張表**在 Phase 1
就已經設計並建表**（`20260707000001_init_schema.sql`），比對
`supabase/schema-draft.md` 確認欄位仍然適用，Phase 4 大部分是接上
應用邏輯而不是從零設計 schema。但盤點下來有 **5 個真實缺口**，動工前
要先補：

### 缺口 1：`checkouts.payment_method` 裝不下混合付款的金額拆分
現有欄位是單一 `text CHECK IN ('cash','ecpay_credit','ecpay_transfer','stored_value','mixed')`
——`mixed` 只是一個旗標，不記錄「現金多少、刷卡多少」。C.1 要求「當日
營收按付款方式拆分」，沒有明細表做不到。**需要新增 `checkout_payments`
表**（見 1.3）。

### 缺口 2：訂金折抵後，`deposit_records` 沒有欄位記錄「已被哪筆結帳用掉」
需求 A.5 訂金自動折抵，但如果同一筆 `deposit_records` 被折抵後沒有
標記消費掉，理論上可以被第二筆結帳重複折抵。**需要新增
`deposit_records.applied_checkout_id`**（見 1.4）。

### 缺口 3：作廢缺對應欄位
`checkouts.status` 已經有 `voided`、`void_reason` 已經有欄位，但沒有
`voided_by`／`voided_at`（對照 Phase 3-2 `deposit_records.waived_by`／
`waived_by_at` 的既有慣例）；`commission_records` 完全沒有作廢相關欄位。
**需要補齊**（見 3.2）。

### 缺口 4：抽成率目前只有「師傅」跟「師傅×服務覆蓋」兩層，沒有「服務」
這層——**這正是你要我先提設計的部分**，見第 2 節。

### 缺口 5（重要，會卡住 C.1 的「訂金收入（含沒收）」）：**沒有任何程式碼
會把 `deposit_records` 標記為 `forfeited`**
翻了 `no_show`／`cancel` 的處理邏輯（`appointmentActions.ts`），兩者都只
改 `appointments.status`，完全不碰 `deposit_records`。也就是說，客人爽約
且訂金已付的情況，`deposit_records` 會永遠停在 `status='paid'`，
`revenue_records`（Phase 1 就建好、但從未被寫入過的表）也永遠是空的。
**這不是 Phase 4 checkout 頁面的問題，是「什麼時候訂金算沒收」這個
業務規則從來沒定案過**——是要爽約當下自動沒收，還是要人工確認（例如
客人事後聯繫改期，訂金可以不沒收）？這是政策決定，不是技術決定，
我不能替你拍板，列在第 5 節待你決定。**在你決定之前，C.1 的「沒收」
欄位我會先做但顯示為 0／N-A，等政策定案後再補寫入邏輯。**

---

## 1. 結帳流程

### 1.1 兩個入口
- **從行事曆帶入**：`AppointmentDetailPanel` 對狀態為 `completed`，或
  `confirmed` 且已報到（`checked_in_at` 有值）的預約新增「結帳」按鈕，
  導到 `/admin/checkout/new?appointmentId=<id>`。
- **手動建單（walk-in）**：`/admin/checkout/new`（不帶 `appointmentId`），
  客人用既有 `CustomerSearchField` 邏輯搜尋或建新客人，服務項目手動加。

**同店到訪合併**（呼應 `schema-draft.md` 既有決策「同一次結帳只彙整
同一次到店的預約，不跨天合併」）：從行事曆帶入時，自動查詢同一位客人
當天其他 `completed`／已報到的預約，列出來讓店員勾選要不要一起結帳，
預設全勾、可取消勾選。**手動建單不觸發這個查詢**（walk-in 客人可能
根本不在系統裡查得到关联預約）。

### 1.2 結帳頁佈局（草案）

```
┌─────────────────────────────────────────┐
│ ← 返回              結帳                  │
├─────────────────────────────────────────┤
│ 客人：王小美・0912345678        [換客人]   │ ← 從 appointment 預帶；
├─────────────────────────────────────────┤    walk-in 用 CustomerSearchField
│ 本次到店還有其他預約，一起結帳嗎？          │ ← 只在有同店其他預約時顯示
│ ☑ 14:00 熱石油壓・林師傅  面額 NT$2280     │
│ ☑ 15:00 美胸按摩・陳師傅  面額 NT$1280     │
├─────────────────────────────────────────┤
│ 項目明細                                  │
│ ┌───────────────────────────────────┐   │
│ │ 熱石油壓 90分／林師傅▾／面額 2280    │   │ ← 師傅欄可調整（換人做）
│ │ 項目折扣：[無▾] [______]        🗑  │   │
│ ├───────────────────────────────────┤   │
│ │ 美胸按摩 60分／陳師傅▾／面額 1280    │   │
│ │ 項目折扣：[無▾] [______]        🗑  │   │
│ └───────────────────────────────────┘   │
│ [+ 新增項目]（加購／walk-in 手動加）        │
├─────────────────────────────────────────┤
│ 面額小計       NT$ 3560                  │
│ 整單折讓  [無▾] [______]                 │
│ 應收           NT$ 3560                  │
├─────────────────────────────────────────┤
│ 訂金折抵：NT$ 640（已付訂金，自動列入，     │
│           不可刪除，可在「查看」展開明細）  │
│ 尚需收款：NT$ 2920                       │
├─────────────────────────────────────────┤
│ 付款方式（可複選，總額須等於尚需收款）       │
│ 現金   [______]                          │
│ 刷卡   [______]                          │
│ 轉帳   [______]                          │
│ （儲值／票券：Phase 5 才開放，此處先顯示    │
│   「即將推出」）                          │
│ 已輸入 NT$2920 ／ 尚需 NT$2920      ✅    │
├─────────────────────────────────────────┤
│              [確認結帳]                  │
│         （總額不符時 disabled）           │
└─────────────────────────────────────────┘
```

### 1.3 付款組合互動與資料結構

新增 `checkout_payments` 表（取代 `checkouts.payment_method` 作為
拆分金額的唯一真實來源，`checkouts.payment_method` 保留但改為**由
`checkout_payments` 推導出來的顯示用欄位**——單一方式時存該方式，
多種方式時存 `'mixed'`，不再是使用者直接輸入的欄位）：

```sql
CREATE TABLE public.checkout_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE RESTRICT,
  method      text NOT NULL
                CHECK (method IN ('cash','ecpay_credit','ecpay_transfer','stored_value','coupon')),
  amount      int NOT NULL CHECK (amount > 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**驗證規則（送出結帳前，前後端都要擋）：**
```
Σ checkout_payments.amount + checkouts.deposit_applied = checkouts.total_paid_amount
```
不等式一律擋下送出，不做「差額自動吸收」——現金找零是店員的事，系統
不幫忙湊數，金額對不上就是對不上，逼店員自己核對清楚。

`stored_value`／`coupon` 現在**先放進 CHECK 約束但 UI 不開放輸入**（灰階
disabled + 「Phase 5 開放」提示），這樣儲值 phase 上線時只要開放 UI，
不需要再動一次 migration——呼應你「先留付款方式的擴充空間」的要求。

### 1.4 訂金折抵機制

`deposit_records` 新增：
```sql
ALTER TABLE public.deposit_records
  ADD COLUMN applied_checkout_id uuid REFERENCES public.checkouts(id) ON DELETE SET NULL;
```

判斷「這筆結帳有沒有可折抵的訂金」的規則：對本次結帳涵蓋的
`appointment_id` 集合，查 `deposit_records` 中
`status='paid' AND applied_checkout_id IS NULL AND appointment_id`
落在集合內（`covered_appointment_ids` 可能涵蓋多筆 appointment，用
`overlaps` 查詢，沿用 Phase 3-2/3-3 已經在用的模式）。找到就自動列為
`deposit_applied`，結帳送出時把該筆 `deposit_records.applied_checkout_id`
設成新建的 `checkouts.id`——**這個欄位本身就是「訂金有沒有被用掉」的
判斷依據，不需要另外改 `status`**（`status` 繼續保持 `paid`，語意仍然
是「錢收到了」，跟「錢有沒有被用在哪張單上」是兩件事，分開記錄）。

作廢結帳時（見第 3 節）要把 `applied_checkout_id` 清回 `NULL`，讓這筆
訂金可以被「重開」後的新結帳重新折抵——不然作廢後訂金就卡死，客人的
錢會憑空消失在系統裡。

### 1.5 折扣分攤演算法（金額必須整數且加總對得起來）

**唯一鐵律：折扣永遠不動 `face_value`，只動 `paid_amount`**（CLAUDE.md
規則 1）。困難的地方在於：多項目 + 項目折扣 + 整單折扣同時存在時，
每個 `checkout_items.paid_amount` 分別要算出多少，而且**加總必須精確
等於 `checkouts.total_paid_amount`**，不能因為四捨五入讓 1 元跑掉（金額
一律整數，不能留小數尾差）。

**計算順序：**
1. 每個項目：`item_subtotal = face_value × quantity`。
2. 套用**項目折扣**（若有）→ `item_after_item_discount`（四捨五入到整數）。
3. `pre_order_discount_total = Σ item_after_item_discount`。
4. 套用**整單折扣**（若有）→ `grand_total`（四捨五入到整數，這就是
   `checkouts.total_paid_amount`）。
5. 把整單折扣**按比例分攤回每個項目**，用「最大餘數法」保證加總不跑掉：
   - 每項目理論分攤額 = `item_after_item_discount × (grand_total / pre_order_discount_total)`，先無條件捨去到整數。
   - 算出還差多少元（`grand_total - Σ 無條件捨去後的金額`），這個差額
     一定是非負整數，逐一分給「捨去時損失的小數部分最大」的項目各加 1 元，
     直到補滿——這是財會系統處理整數分攤的標準做法（避免浮點數誤差），
     結果保證 `Σ checkout_items.paid_amount === checkouts.total_paid_amount`
     精確相等。
6. `checkouts.discount_amount = subtotal_face_value - total_paid_amount`
   （單一欄位記總折扣金額，不分項目折扣/整單折扣兩種來源——如果你需要
   拆分兩者做報表，跟我說，要加欄位不難，但目前需求沒提到要拆）。

這段邏輯會是一個獨立、有完整單元測試的純函式（類似
`splitServiceSlots`／`depositPolicy` 的寫法），**輸入面額陣列＋兩層折扣
設定，輸出每項目的 `paid_amount`**，不摻雜任何 Supabase 呼叫，方便窮舉
邊界案例（例如折扣後金額為 0、折扣超過面額、只有一個項目時不需要分攤
邏輯等）。

---

## 2. 抽成率資料結構（你要求先確認再實作）

### 2.1 現況
- `staff.default_commission_rate numeric(5,2) NOT NULL`——每個師傅一定
  有一個保底抽成率。
- `staff_service_skills.commission_rate_override numeric(5,2) NULL`——
  特定師傅對特定服務可以有個別覆蓋。

這兩層本身沒問題，但**沒有「服務本身的預設抽成率」這一層**——目前如果
老闆想說「熱石油壓不管誰做都是 45%，肩背舒放都是 38%」，唯一做法是替
每個師傅都手動填一筆 `staff_service_skills` 覆蓋，新師傅加入時還要記得
重新填一次，容易漏、不好維護。

### 2.2 我的建議：三層，服務優先

```sql
ALTER TABLE public.services
  ADD COLUMN default_commission_rate numeric(5,2) NOT NULL DEFAULT 40.00;
```
（`DEFAULT 40.00` 只是讓 migration 能過、給現有服務一個起始值，實際
數字上線前你要逐一核對調整——這不是我替你決定費率，只是技術上欄位
不能是 NULL 又沒有初始值。）

**有效抽成率解析順序（由細到粗）：**
1. `staff_service_skills.commission_rate_override`——這個師傅對這個
   服務的個別談定費率（例如資深師傅談到更高%）。
2. `services.default_commission_rate`——這個服務本身的預設費率（老闆
   對「這個服務值多少%」的政策）。
3. `staff.default_commission_rate`——師傅保底費率，只有在**服務本身
   沒設定**（理論上不會發生，因為第 2 層 `NOT NULL`）時才會用到，
   保留純粹是防禦性寫法，避免資料異常時整個結帳流程掛掉。

**為什麼服務優先於師傅，而不是反過來？** 因為抽成率本質上是「這個
服務該分多少%出去」的定價政策（跟服務的技術門檻/耗材成本有關），
師傅間的差異則是「這個人談到的例外」，例外理應蓋過通例——這跟你原話
「服務類別預設 X%，個別覆蓋」的語意一致。**如果你想要的其實是相反
順序**（師傅的保底費率優先於服務，服務只是「某些特殊服務才需要蓋掉
師傅費率」），這是純粹的業務政策選擇，兩種都技術上可行，我在第 5 節
列成待你確認的問題，不自己拍板。

**服務類別（`service_categories`）本身不設抽成率**——你的用詞是「服務
類別預設」，但我建議設在 `services`（例如「熱石油壓」）而不是
`service_categories`（例如「按摩」大類），因為同一大類底下的不同服務
（例如「熱石油壓」跟「肩背舒放」）耗材/技術門檻可能不同，值得有各自
的預設值；如果之後真的所有服務都跟類別走同一個%，把 `services` 的值
批次設成跟類別一樣就好，反過來（先設在類別、之後要拆到服務層級）要
搬資料，方向選細的比較安全。

### 2.3 抽成率設定介面（`/admin/commission-rates`，owner 限定）

```
┌─────────────────────────────────────────┐
│ 抽成率設定                    僅店主可見   │
├─────────────────────────────────────────┤
│ 服務項目預設抽成率                         │
│  熱石油壓          [45.00] %             │
│  肩背舒放          [40.00] %             │
│  全身全腿舒放       [40.00] %             │
│                                    [儲存] │
├─────────────────────────────────────────┤
│ 師傅個別覆蓋        師傅：[林師傅▾]         │
│  熱石油壓   服務預設45%  覆蓋 [______] 🗑  │
│  肩背舒放   服務預設40%  覆蓋 [______] 🗑  │
│  （🗑 清除覆蓋＝改回吃服務預設值）           │
│                                    [儲存] │
├─────────────────────────────────────────┤
│ 師傅保底抽成率（防禦性欄位，正常不會用到）   │
│  林師傅  [40.00] %                       │
│  陳師傅  [40.00] %                       │
│                                    [儲存] │
└─────────────────────────────────────────┘
```

### 2.4 抽成計算（結帳完成當下逐筆寫入）

```
commission_amount = round(face_value × effective_rate / 100)
```
`round` 用四捨五入（`Math.round`，正數金額下等同標準四捨五入）。**逐筆
寫在 `checkout_items` 層級**（一個 `checkout_item` 一筆
`commission_record`，`quantity > 1` 時面額已經是 `face_value × quantity`
的小計，抽成也是對這個小計算，不是對單價算——避免「單價抽成 × 數量」
跟「小計抽成」四捨五入結果不一致的邊界案例）。

**鐵律測試（B.3 你要求的）**：客人拿到折扣、實付低於面額，
`commission_records.commission_amount` 必須完全不受影響，永遠用
`checkout_items.face_value` 算，測試要故意造一個「面額 2280、打 5 折
實付 1140」的案例，斷言抽成金額等於用 2280 算出來的數字，不是用 1140。

---

## 3. 作廢重開流程

### 3.1 為什麼是「作廢＋開新單」而不是「直接改舊單」
結帳單完成後代表金流跟抽成都已經是「已發生的事實」，直接改舊單會讓
歷史記錄失真、對帳對不起來。作廢重開保留原始單據（含錯誤內容）當
稽核軌跡，新單是全新的一筆交易，兩者用 `reopened_from_checkout_id`
串起來方便追溯，不是覆蓋。

### 3.2 需要補的欄位
```sql
ALTER TABLE public.checkouts
  ADD COLUMN voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN reopened_from_checkout_id uuid REFERENCES public.checkouts(id) ON DELETE SET NULL;

ALTER TABLE public.commission_records
  ADD COLUMN voided boolean NOT NULL DEFAULT false,
  ADD COLUMN voided_at timestamptz;
```

### 3.3 狀態機

```
                    ┌───────────────────────────────┐
                    │                                 │
   [新建/重開]  →  completed  ──(owner: 作廢)──▶  voided
                    │                                 │
                    │                          (owner: 重開)
                    │                                 │
                    │                                 ▼
                    │                    建立新 checkout：
                    │                    reopened_from_checkout_id = 舊單 id
                    │                    items 預帶舊單內容（可編輯增刪改）
                    │                    走一般結帳送出流程
                    │                                 │
                    └─────────────────────────────────┘
                                    （新單同樣是 completed 起點）
```

**作廢（void）動作，owner 限定，單一交易內完成：**
1. `checkouts.status='voided'`, `void_reason`, `voided_by`, `voided_at`。
2. 該 checkout 底下所有 `checkout_items` 對應的 `commission_records`：
   `voided=true`, `voided_at=now()`（**不刪除**，稽核需要留痕；報表查詢
   一律加 `WHERE voided=false`）。
3. `deposit_records` 中 `applied_checkout_id = 此 checkout.id` 的紀錄，
   清回 `applied_checkout_id = NULL`（讓訂金可以在重開後重新折抵）。
4. 寫 `audit_logs`（`admin.checkout.void`），`before`/`after` 記錄
   `total_paid_amount`、`void_reason`。

**重開（reopen）**：不是資料庫操作，是**導頁到結帳composer**，用舊單
的 `checkout_items`（服務/師傅/面額/數量）預填表單，折扣重新輸入
（舊單的折扣不一定是新單要的，強制重新確認金額比較安全，不自動帶
折扣設定），付款方式清空重新輸入。送出時建立全新 `checkouts` 行，
`reopened_from_checkout_id` 指回舊單。

`checkouts.status` 的第三個值 `refunded`（schema 已有）**這輪不實作**
——那是「服務已完成、客人事後要求全額退費」，跟「單據金額打錯字要
重開」是不同流程，且退費涉及要不要連動退抽成、退預約狀態等更複雜的
政策問題，建議留到之後有明確需求再設計，不在 Phase 4 範圍內。

---

## 4. 日結與報表

### 4.1 頁面：`/admin/reports/daily`（owner 限定）

```
┌─────────────────────────────────────────┐
│ 日結報表          [日期選擇：2026-07-15]  │
├─────────────────────────────────────────┤
│ 當日營收（今日結帳收到的新款項，不含訂金）  │
│  現金   NT$ 12,400                       │
│  刷卡   NT$ 8,200                        │
│  轉帳   NT$ 0                            │
│  合計   NT$ 20,600                       │
├─────────────────────────────────────────┤
│ 訂金收入（今日訂金相關異動，獨立於上面）    │
│  今日收訂金  NT$ 1,280（2 筆）            │
│  今日沒收    NT$ 0 【依賴第 5 節政策決定】 │
├─────────────────────────────────────────┤
│ 師傅業績（面額）與抽成                     │
│  林師傅   面額 NT$8,200   抽成 NT$3,690   │
│  陳師傅   面額 NT$6,400   抽成 NT$2,560   │
├─────────────────────────────────────────┤
│ 客數（結帳筆數）  8 筆                    │
├─────────────────────────────────────────┤
│              [匯出 CSV]                  │
└─────────────────────────────────────────┘
```

### 4.2 「當日營收」跟「訂金收入」為什麼分開算，不能合併

這是容易做錯、值得明講的地方：訂金是**在預約當下**透過 ECPay 收的，
發生日期是 `deposit_records.paid_at`，不是結帳當天。如果結帳時的
「訂金折抵 NT$640」也算進當日營收，會**把同一筆錢在兩天各算一次**
（付訂金那天 ECPay 入帳一次、結帳那天又被算進營收一次）。所以：

- **當日營收** = `Σ checkout_payments.amount`，`WHERE checkout_at::date
  = 目標日期 AND checkouts.status='completed'`（排除 voided）——只算
  「今天新收到的錢」，訂金折抵金額不計入。
- **訂金收入** = `Σ deposit_records.amount WHERE deposit_records.paid_at::date
  = 目標日期`（今天付的訂金，不管哪天才會被拿去結帳折抵）+ 沒收金額
  （見第 5 節，政策未定前顯示 0）。

兩者是完全獨立的兩條線，日結報表分開列，不加總成一個「總營收」數字
——如果你要一個「今天店裡實際入帳多少錢」的總數，正確算法是兩者相加，
我可以另外加一行「今日現金流入合計」，但**這跟『當日營收』的會計意義
不同**，混在一起容易讓人誤讀，建議維持分開顯示，需要合計的話我加一
個獨立小計行，不覆蓋掉這兩條線本身。

### 4.3 會員頁「累計消費」接上真值
`src/lib/admin/memberData.ts` 的 `totalSpend` 目前固定 `null`
（顯示「N/A（尚未結帳上線）」）。Phase 4 完成後改成：
```
Σ checkout_items.paid_amount
WHERE checkout_items 所屬 checkout.customer_id = 此客人
  AND checkout.status = 'completed'
```
（作廢的單不計入，重開後的新單才計入——這樣「累計消費」永遠反映
「目前有效的交易」，不會因為作廢重開而重複計算或漏算。）

### 4.4 CSV 匯出
Server Action／API route 產出 `text/csv`，欄位涵蓋日結頁面上的每一行
（付款方式拆分、師傅業績/抽成、訂金收入）。技術上直接串字串輸出，
不需要額外套件，沿用專案目前「能簡單做就不引入新依賴」的風格。

---

## 5. 待你決定的問題

### 5.1 抽成率優先順序：服務優先，還是師傅優先？
見 2.2——我建議「`staff_service_skills` 覆蓋 > `services` 服務預設 >
`staff` 師傅保底」，服務的政策定價蓋過師傅保底。如果你要的是相反
順序（師傅保底优先於服務預設），跟我說一聲，兩種都不難做，但決定了
就不要中途換，資料遷移方向不同。

### 5.2 訂金沒收的觸發時機（會卡住 C.1「訂金收入（含沒收）」）
現況：標記爽約（`no_show`）完全不碰 `deposit_records`，沒收機制
**從缺**。三個選項：
1. **自動**：`no_show` 動作觸發時，若該預約有 `paid` 狀態的訂金，
   自動轉 `forfeited` + 寫一筆 `revenue_records`。簡單，但爽約後
   客人聯繫改期時，店員還得手動把沒收改回來。
2. **人工二次確認**：`no_show` 只是標記事件，訂金沒收要店員在
   （例如）會員詳情頁的訂金列表另外按「確認沒收」，比較貼近實際
   營運（你們可能常有事後通融的情況）。
3. **暫緩**：Phase 4 先不做沒收機制，日結報表的「沒收」欄位固定顯示
   0，等你想清楚政策再補（不影響 Phase 4 其他部分先上線）。

**我的建議是選項 3**——理由是這是一個獨立的業務規則決策，不應該為了
趕上 Phase 4 的報表功能就先假設一個可能不對的規則；報表欄位先擺著，
邏輯之後補上不影響已經上線的部分。但如果你已經有明確想法（例如就是
選項 1），直接告訴我，我可以這輪一起做掉。

### 5.3 折扣金額要不要拆「項目折扣」跟「整單折扣」兩個獨立數字做報表？
目前設計 `checkouts.discount_amount` 是兩者的合計，日結報表若要分開
統計「店員常打整單折扣還是常給項目折扣」，需要加欄位分開記——現在
沒這個需求就不加，之後要加也不影響既有資料（新欄位、舊資料回填 0 或
NULL 皆可）。

### 5.4 「客數」的定義
草案裡定義成「結帳筆數」（`count(checkouts)`），不是「不重複客人數」
（同一人今天結兩次帳算 2 筆還是 1 人？）。用結帳筆數是一般 POS 系統
的慣例定義，如果你要的是不重複客人數，跟我說一聲，SQL 上是
`count(distinct customer_id)` 的差別，不難改，只是先跟你確認語意。

---

## 6. 權限矩陣

| 操作 | manager | owner |
|---|---|---|
| 結帳（含手動建單、折扣、混合付款） | ✅ | ✅ |
| 查看自己完成的結帳單 | ✅ | ✅ |
| 抽成率設定（服務預設／師傅覆蓋／師傅保底） | ❌ | ✅ |
| 日結報表／CSV 匯出 | ❌ | ✅ |
| 作廢結帳單 | ❌ | ✅ |
| 重開（建立替代新單） | ❌ | ✅ |

沿用 Phase 3-3 建立的 `requireOwnerForAction()` 單一判斷來源，
owner-only 的 Server Action 一律用它包，不是只在 UI 藏按鈕
（Phase 3-3 驗收就因為這個模式沒落實到位出過一次真的漏洞，見
[design-log.md](design-log.md) 2026-07-11 的教訓紀錄，這次要在設計
階段就把每個入口都想清楚，不要等驗收才發現）。

---

## 7. 測試計畫（118 案不得變紅，新邏輯要補新案）

- **折扣分攤純函式**：面額不變、`Σ paid_amount === total_paid_amount`
  精確相等（含最大餘數法的邊界案例：折扣後金額除不盡、只有一項不需要
  分攤、折扣把某項目打到 0 元）。
- **抽成鐵律**：折扣後實付低於面額，`commission_amount` 仍用
  `face_value` 算——這是 B.3 明確要求的案例，最高優先。
- **抽成率解析順序**：三層依序覆蓋的所有組合（只有師傅保底／服務有
  預設師傅沒覆蓋／師傅有覆蓋蓋過服務預設）。
- **付款組合驗證**：`Σ checkout_payments + deposit_applied` 與
  `total_paid_amount` 不相等時擋下送出，相等時放行；總額為 0（全額
  訂金折抵、免收款）的邊界案例。
- **訂金折抵防重複**：`applied_checkout_id` 已被佔用的訂金不會被
  第二筆結帳撈到。
- **作廢流程**：作廢後 `commission_records.voided=true`、
  `deposit_records.applied_checkout_id` 清空可再折抵、日結報表跟
  「累計消費」查詢都排除 `voided` 的結帳（不能漏掉任何一處查詢忘記加
  這個條件——這正是 Phase 3-3 教訓要求的「列出每個入口」，作廢排除
  邏輯至少會出現在：日結報表、累計消費、師傅業績三個地方，要逐一
  確認，不能改了一處就假設其他地方也一起對了）。
- **當日營收 vs 訂金收入不重複計算**：造一筆「昨天付訂金、今天結帳
  折抵」的案例，斷言今天的「當日營收」不包含那 640 元，「訂金收入」
  也不會在今天重複算一次（因為判斷依據是 `paid_at` 不是結帳日）。
