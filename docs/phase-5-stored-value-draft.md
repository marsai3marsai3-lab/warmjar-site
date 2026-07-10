# Phase 5：儲值方案系統 — 設計草案

> 狀態：**草案，待確認** — 本檔案只描述資料結構、流程與頁面佈局，
> 尚未實作。確認後刪除本行、把「狀態」改成「已定案 YYYY-MM-DD」，並在
> [design-log.md](design-log.md) 補一筆摘要。業務規則以
> [stored-value-rules.md](stored-value-rules.md) 為準，本檔案不重複
> 抄一次數字，只講技術設計。

## 0. 現有 schema 盤點

好消息：`stored_value_plans` / `stored_value_accounts` /
`stored_value_topup_orders` / `stored_value_transactions` 四張表在
Phase 1 就已經設計並建表，且 **`checkouts` 表已經有
`stored_value_principal_used` / `stored_value_bonus_used` 兩個欄位**
——Phase 4 建結帳系統時就預留好了，只是當時儲值支付還沒做，一直是
`0`，這輪直接接上，不需要新 migration 補這兩欄。

盤點下來，真正的缺口只有 4 個：

1. **`stored_value_topup_orders` 缺 `sold_by`**——沒有欄位記錄「這筆
   儲值是哪位師傅賣的」，師傅銷售獎金的歸屬記錄做不到。
2. **`stored_value_transactions` 缺 `plan_id` / `sold_by` /
   `expires_at`**——`plan_id` 供銷售分析（決策 7）、`sold_by`
   同上、`expires_at` 是贈額到期的預留欄位（決策 2，這輪一律
   `NULL`）。
3. **`stored_value_transactions.type` 的 CHECK 約束沒有涵蓋「作廢
   結帳單導致的儲值回沖」**——現有值只有
   `'topup','consume','refund','adjustment'`，回沖（見 C.5）需要一個
   語意清楚、不跟「客人主動退費」（`refund`，只退本金、贈額歸零）
   混淆的獨立值。
4. **沒有儲值購買的付款拆分表**——見 B.1 的建議。

---

## 1. A. 方案設定（`/admin/stored-value-plans`，owner 限定）

`stored_value_plans.tier` 的 CHECK 約束鎖死只能是
`'暖心','沐光','御藏'` 三個值（Phase 1 就定死），這輪不會、也不需要
新增第四階。

### 頁面

```
┌─────────────────────────────────────────┐
│ 儲值方案設定                  僅店主可見   │
├─────────────────────────────────────────┤
│ 暖心會員                          [啟用中] │
│  儲值本金 [5000]  贈額 [200]              │
│  帳戶總額：NT$5,200（自動算，不可編輯）     │
│                          [儲存] [停用]    │
├─────────────────────────────────────────┤
│ 沐光會員                          [啟用中] │
│  儲值本金 [10000]  贈額 [750]             │
│  ...                                     │
├─────────────────────────────────────────┤
│ 御藏會員                          [啟用中] │
│  ...                                     │
└─────────────────────────────────────────┘
```

### 「可調整但不可刪除已有人購買的方案」

沒有「刪除」按鈕，只有「啟用／停用」（`is_active`）——停用後
`/admin/checkout` 的儲值購買流程（B）跟未來的線上購買都不會再列出
這個方案，但既有持有這個方案餘額的客人不受影響（餘額、消費、退費
都正常運作，只是不能再賣新的）。金額（`principal_amount` /
`bonus_amount`）本身允許調整，但**只影響之後新賣出的份數**——已經
賣出的 `stored_value_topup_orders` 是历史快照（`principal_amount`/
`bonus_amount` 在下單當下就寫死），改方案金額不會讓已購買的客人的
帳戶餘額跟著變動，這是既有「金流用流水帳當唯一真實來源、彙總表不
可回頭改」的既定風格延伸。

判斷式（純函式，`canDeactivateWithoutWarning` 這種其實不需要，因為
停用本來就不影響既有客人——**真正需要擋的是「金額能不能亂改」**：
建議金額調整前彈出警告「這只影響之後新賣出的份數，已購買客人的
帳戶餘額不受影響」，不做技術阻擋，因為這本來就是安全的操作）。

---

## 2. B. 購買儲值（開通/加值）

### B.1 收款機制建議：新增獨立的 `stored_value_topup_payments` 表，不重用 `checkout_payments`

**我的建議：不要把儲值購買塞進 `checkouts`/`checkout_items` 的結帳
管線，另外建一張小表，結構比照 `checkout_payments`：**

```sql
CREATE TABLE public.stored_value_topup_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topup_order_id uuid NOT NULL REFERENCES public.stored_value_topup_orders(id) ON DELETE RESTRICT,
  method         text NOT NULL CHECK (method IN ('cash','ecpay_credit','ecpay_transfer')),
  amount         int NOT NULL CHECK (amount > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

**為什麼不重用 `checkout_items`/`commission_records` 那條管線：**
儲值購買沒有 `face_value`（不是「用面額打折買服務」，是「付 5000
換 5200 額度」，性質完全不同），也**不產生 `commission_records`**
——師傅銷售儲值拿的是「當月累積門檻獎金」，不是「單筆 % 抽成」，
兩套獎勵邏輯如果共用同一張表，將來要拆分報表（一個是每月結算、
一個是每筆結帳算）會很痛苦。硬塞進 `checkout_items` 只是表面上省了
一張表，實際上把兩個不同性質的獎勵系統攪在一起，之後最容易出錯。

**為什麼還是要拆成獨立的付款表（而不是 `stored_value_topup_orders`
直接一個 `payment_method` 欄位就好）：** 保留跟 Phase 4 一致的「可
混合付款」能力（例如客人付 5000 用 3000 現金 +2000 刷卡買暖心方案）
——這不是本輪需求明講要的，但技術成本很低（幾乎是複製 Phase 4已經
寫好、已測試過的 `isPaymentComplete`／`derivePaymentMethod` 那套邏輯
直接套用），而且維持介面一致：店員在會員詳情頁儲值時看到的付款輸入
框，跟結帳頁看到的長得一樣，不用學兩套操作。如果你覺得這是過度
設計、儲值付款一律單一方式就好，跟我說一聲，我就把
`stored_value_topup_orders.payment_method`（欄位已經在，Phase 1
就有）直接當唯一付款欄位，不建這張新表——**這是我建議的方向，但
不是我自己拍板，你確認要不要混合付款能力**。

### 頁面（會員詳情頁「儲值」分頁內的「+ 儲值」對話框）

```
┌─────────────────────────────────────────┐
│ 儲值                                      │
├─────────────────────────────────────────┤
│ 選擇方案                                  │
│ ○ 暖心會員 NT$5,000→5,200                │
│ ○ 沐光會員 NT$10,000→10,750              │
│ ● 御藏會員 NT$20,000→21,750              │
├─────────────────────────────────────────┤
│ 銷售歸屬師傅（必填，供銷售獎金歸屬記錄）    │
│ [林師傅▾]                                │
├─────────────────────────────────────────┤
│ 應收 NT$20,000                           │
│ 現金 [______]  刷卡 [______]              │
│ 已輸入 NT$20,000／應收 NT$20,000    ✅    │
├─────────────────────────────────────────┤
│              [確認儲值]                  │
└─────────────────────────────────────────┘
```

送出時：`requireAdminForAction()`（manager 可操作，B 沒有像 A/D 那樣
限定 owner，跟 Phase 4 結帳權限一致）：
1. 建 `stored_value_topup_orders`（`status='paid'`、`paid_at=now()`、
   `sold_by=選的師傅`、金額快照自方案）。
2. 建 `stored_value_topup_payments`。
3. Upsert `stored_value_accounts`（沒有帳戶就先建，
   `principal_balance += principal_amount`，
   `bonus_balance += bonus_amount`）。
4. 寫 `stored_value_transactions`（`type='topup'`，
   `principal_delta=+本金`，`bonus_delta=+贈額`，
   `plan_id`、`sold_by`、`expires_at=NULL`、
   `related_topup_order_id`、`operator_id=目前登入者`）。
5. 寫 `audit_logs`（`admin.stored_value.topup`）。

### B.2 線上購買（ECPay）的預留方式

**這輪不實作，但要確保之後接上時不用大改資料結構或重寫入帳邏輯：**

1. `stored_value_topup_orders` 已經有 `payment_method` /
   `ecpay_trade_no` / `status`（`pending/paid/failed/refunded`）——
   跟 `deposit_records` 當初的 ECPay 欄位設計完全同一套模式，直接
   照抄即可：客人在（未來的）`/member` 頁選方案 → 建一筆
   `status='pending'` 的 `stored_value_topup_orders` → 導去 ECPay
   付款頁 → webhook 收到成功通知後 `status→'paid'`。
2. **關鍵設計原則**：第 4 步「上帳」（更新 `stored_value_accounts`
   + 寫 `stored_value_transactions`）要寫成一個**共用函式**（例如
   `applyStoredValueTopup(supabase, topupOrderId)`），櫃檯付現/刷卡
   流程（B.1）跟未來的 ECPay webhook**呼叫同一個函式**，不要各自
   实作一份——這樣線上購買上線時，webhook handler 只是「驗證簽章 →
   把 `stored_value_topup_orders.status` 轉 `paid` → 呼叫
   `applyStoredValueTopup()`」，跟
   `src/app/api/book/ecpay/webhook/route.ts` 處理訂金付款成功的
   寫法幾乎一樣，不需要重新設計。
3. `sold_by` 在線上自助購買情境**允許 `NULL`**（沒有師傅銷售歸屬
   ——客人自己在 LIFF 點的，不算進任何人的銷售獎金）。

### B.3 驗證「按人按月彙總本金銷售額」查詢寫得出來

```sql
SELECT sold_by, SUM(principal_delta) AS total_principal_sold
FROM stored_value_transactions
WHERE type = 'topup'
  AND sold_by IS NOT NULL
  AND created_at >= '2026-07-01T00:00:00+08:00'
  AND created_at <  '2026-08-01T00:00:00+08:00'
GROUP BY sold_by
ORDER BY total_principal_sold DESC;
```

跑得出來——`sold_by` 直接放在 `stored_value_transactions`（不是只放
在 `stored_value_topup_orders` 再要求月結時 join 回去），是刻意的
**去正規化**：`stored_value_transactions` 是流水帳唯一真實來源，
月結查詢應該能只查這一張表就得到答案，不需要 join，跟
`checkout_items.face_value` 快照當下面額（不去 join 回
`service_variants` 現在的價格）是同一種設計哲學。抽成結算批次 phase
接手時，直接拿這條 SQL 當起點套門檻級距（30k/50k/80k）分組就好。

---

## 3. C. 儲值支付（接進結帳）

### 3.1 結帳頁 UI 變更

`CheckoutComposer` 的付款區塊新增第四行（取代 Phase 4 那個灰階
「即將推出」占位）：

```
┌─────────────────────────────────────────┐
│ 付款方式（可複選，總額須等於尚需收款）       │
│ 現金   [______]                          │
│ 刷卡   [______]                          │
│ 轉帳   [______]                          │
│ 儲值   [______]  可用 NT$8,700           │
│         （本金8,200＋贈額500）[全部扣抵]  │
│         將扣除：贈額 NT$500＋本金 NT$300  │  ← 即時預覽，帳先扣贈額
├─────────────────────────────────────────┤
│ 已輸入 NT$XXX／尚需 NT$XXX          ✅   │
└─────────────────────────────────────────┘
```

輸入的金額**不是**店員自己決定要扣本金還是贈額——系統依「贈額優先」
規則自動算，UI 只即時顯示會怎麼扣（見下方純函式），店員只決定「要
扣多少總額」。「全部扣抵」按鈕快速帶入
`min(尚需收款, 可用餘額)`。

### 3.2 分配演算法（純函式，比照 Phase 4 `allocateCheckoutDiscounts`
的寫法風格）

```ts
export type StoredValueAllocation = { bonusUsed: number; principalUsed: number };

export function allocateStoredValueDeduction(
  amountToApply: number,
  principalBalance: number,
  bonusBalance: number
): StoredValueAllocation {
  const bonusUsed = Math.min(amountToApply, bonusBalance);
  const principalUsed = Math.min(amountToApply - bonusUsed, principalBalance);
  return { bonusUsed, principalUsed };
}
```

呼叫端要先擋「`amountToApply` 不能超過
`principalBalance + bonusBalance`」（決策 4：餘額不可為負），這條
擋在 Server Action 跟前端輸入框的 `max` 都要各自擋一次，不只靠前端。

### 3.3 送出結帳時的資料寫入

延伸 Phase 4 `createCheckout`：付款陣列裡 `method='stored_value'`
的那一行，除了照常寫進 `checkout_payments`，額外：
1. 查 `stored_value_accounts` 目前餘額，驗證沒有超額（防止前端算
   完到送出之間餘額被別的結帳單搶走的競態——理論上這家店同時兩個
   人在同一個客人帳戶扣款的機率極低，但驗證成本低，還是加）。
2. 用 3.2 的函式算出 `bonusUsed`/`principalUsed`。
3. 更新 `stored_value_accounts`（兩者都扣減）。
4. 寫 `stored_value_transactions`（`type='consume'`，
   `principal_delta=-principalUsed`，`bonus_delta=-bonusUsed`，
   `related_checkout_id`）。
5. **把 `checkouts.stored_value_principal_used` /
   `stored_value_bonus_used` 設成這兩個數字**——這兩欄 Phase 1 就
   保留好了，這輪終於用上，讓結帳明細頁不用 join
   `stored_value_transactions` 就能顯示扣了多少本金/贈額。

### 3.4 鐵律測試（你要求的 B.3/C.4，兩份需求文件編號打架，統一以本檔案
為準）

跟 Phase 4 `ironRule.test.ts` 同一個檔案延伸一個新案例：面額 2280、
用「贈額 200 ＋ 本金 1000」的儲值組合支付（合計 1200，低於面額），
斷言 `commission_records.commission_amount` 仍然是
`round(2280 × rate)`，跟付款方式完全無關——因為 `calculateCommissionAmount`
本來就只吃 `face_value`，不會有任何程式碼路徑把付款方式傳進去，
這個測試主要是**防止未來有人「順手」把付款資訊也傳進抽成計算函式**
而不是真的預期現在會算錯。

### 3.5 作廢已用儲值支付的結帳單：回沖

延伸 Phase 4 `voidCheckout`。作廢時，除了既有的「`commission_records`
標 voided、釋放已折抵訂金」，新增：查這張結帳單有沒有
`stored_value_transactions`（`type='consume'`，
`related_checkout_id=此單`），如果有：
1. 把餘額加回去（`principal_balance += principalUsed`，
   `bonus_balance += bonusUsed`）。
2. 寫一筆新的 `stored_value_transactions`，**`type='void_reversal'`**
   （新增的 type 值，`principal_delta=+principalUsed`，
   `bonus_delta=+bonusUsed`）——**不是**`refund`，因為 `refund`
   在這個系統的語意是「客人主動要求退費，贈額歸零」，回沖的語意是
   「這筆消費從來沒有真的發生，原路退回，贈額不受影响」，兩者財務
   意義不同，用同一個 type 會讓月結對帳看不出「這筆贈額增加是因為
   作廢，還是系統調整」。
3. 寫 `audit_logs`。

作廢時如果那筆消費原本用到的贈額**已經被後續其他消費用掉**（理論上
不可能，因為餘額變動都是即時的，作廢前那筆贈額必然還在帳上，除非
中間又有别的交易——但因為是同一個客人、同一個帳戶餘額池，即使中間
有別的消費，只要餘額池夠大，回沖照樣是「餘額 += 金額」，不需要
追蹤「退的是不是同一批贈額」，因為贈額進了同一個池子之後就是
無差別的一筆錢，不分批次）。

---

## 4. D. 退費（owner 限定）

### 頁面（會員詳情頁「儲值」分頁）

```
┌─────────────────────────────────────────┐
│ 目前餘額：本金 NT$8,200／贈額 NT$500       │
│                              [退費]      │ ← 只有 owner 看得到
├─────────────────────────────────────────┤
│ 確認退費                                  │
│ 將退回本金 NT$8,200（現金/原路，人工作業） │
│ 贈額 NT$500 將同步歸零，不予退還            │
│ 帳戶保留，之後可以再儲值                    │
│                     [確認退費] [取消]     │
└─────────────────────────────────────────┘
```

跟 Phase 3-2 的「退款標記」同一個文案原則：**明確告知這只是紀錄狀態
更新，實際把錢退給客人是人工作業**（現金退還或轉帳，系統不連 ECPay
退款 API）。

送出時（`requireOwnerForAction()`）：
1. 驗證 `principal_balance > 0`（沒有本金餘額不能退——`bonus_balance`
   可能大於 0 但 `principal_balance=0` 的情況，直接把 bonus 歸零，
   不算「退費」，是「贈額歸零但沒有錢要退」，這種邊界案例 UI 上
   `[退費]` 按鈕本身可以維持顯示但按下去的文案改成「僅贈額將歸零，
   無本金可退」——需要你確認這個邊界案例的呈現方式是否認同，我先
   照這個邏輯做）。
2. 寫 `stored_value_transactions`（`type='refund'`，
   `principal_delta = -principal_balance`，
   `bonus_delta = -bonus_balance`）。
3. `stored_value_accounts` 兩個餘額都歸零。
4. 寫 `audit_logs`（`admin.stored_value.refund`，記錄退費當下的
   本金/贈額金額供稽核）。

---

## 5. E. 呈現

### 5.1 會員詳情頁——新增「儲值」分頁（不是卡片，見下方說明）

你的需求原文是「新增儲值卡片」，但既有的
`AppointmentDetailPanel`/`MemberDetailView` 已經用「分頁」
（基本資料／預約歷史／訂金與爽約／服務紀錄）處理同等資訊量的區塊，
儲值同時要放「餘額摘要＋交易流水列表＋儲值/退費操作」，內容量
接近「訂金與爽約」那個分頁，我建議**比照既有分頁模式**，新增第五個
分頁「儲值」，不要另外做一張獨立卡片跟分頁並存造成頁面結構不一致
——如果你就是要卡片（例如想讓儲值資訊在切分頁之前就看得到），
跟我說，改起來不難，只是先跟你確認要哪一種。

```
[基本資料] [預約歷史] [訂金與爽約] [服務紀錄] [儲值]
┌─────────────────────────────────────────┐
│ 最近購買方案：沐光會員                     │
│ （彙總帳戶不分池，這裡只是顯示最近一次購買  │
│  的方案當參考，不代表帳戶只認這個方案）      │
│ 本金餘額：NT$8,200                        │
│ 贈額餘額：NT$500                          │
│ 可用總計：NT$8,700                        │
│                    [+ 儲值]     [退費]    │ ← 退費 owner 限定
├─────────────────────────────────────────┤
│ 交易紀錄                                  │
│ 07/10 儲值 沐光會員 +10,750               │
│        本金+10,000／贈額+750／銷售:陳師傅  │
│ 07/12 消費 -1,200（本金-1,000／贈額-200）  │
│        關聯結帳 #a1b2c3                   │
│ 07/13 作廢回沖 +1,200（本金+1,000／贈額+200）│
│        關聯結帳 #a1b2c3                   │
└─────────────────────────────────────────┘
```

### 5.2 會員列表篩選「有儲值餘額」

延伸 `MemberListFilters`，新增 `hasStoredValueBalance?: boolean`，
查詢條件：`stored_value_accounts.principal_balance +
stored_value_accounts.bonus_balance > 0`。跟既有的
`requiresDepositOnly`／`hasNoShowHistory` 並列，同樣是疊加式篩選
（AND 邏輯）。

### 5.3 日結報表：負債呈現（你要求的重點）

**核心概念**：客人付現金買儲值，店裡收到的是**預收款**，會計上是
**負債增加**（欠客人未來的服務），不是營收——真正的營收要等客人
**消費**（用儲值支付結帳）那天才算數。這跟 Phase 4「訂金收入不能
併入當日營收」是同一個道理，這次多一層：**贈額本身完全不是現金**
（店家沒收到任何錢，只是帳面上多欠客人一筆），如果報表把「贈額」
也算進「今日收入」會更嚴重地高估現金流入。

```
訂金收入（含沒收，獨立於當日營收）        ← Phase 4 既有
  今日收訂金  NT$1,280
  今日沒收    NT$0

儲值收入（現金流入，非營收——收到的是預收款，
         屬遞延負債，客人消費兌現時才轉為營收）
  今日儲值本金（實際收到的現金） NT$20,000
  今日贈送贈額（非現金，僅帳面增加負債） NT$1,750
  ──────────────────────────────
  今日儲值現金流入合計          NT$20,000  ← 只算本金，這才是真的收到的錢

儲值消耗（今日儲值支付服務，已計入上方「當日營收」，
         這裡只是拆解本金/贈額比例方便對帳，不要重複加總）
  今日消耗本金  NT$1,000
  今日消耗贈額  NT$200
  合計（已算進當日營收，不要再加一次） NT$1,200
```

CSV 匯出同步擴充這幾行。**這一段的欄位命名跟排版我會在文案上明確
標註「非營收」「已計入當日營收」等提示字樣，降低誤讀成兩份不同的
營收數字相加的風險。**

---

## 6. 權限矩陣

| 操作 | manager | owner |
|---|---|---|
| 儲值方案設定（金額/啟用停用） | ❌ | ✅ |
| 櫃檯儲值（購買/加值） | ✅ | ✅ |
| 結帳時使用儲值扣款 | ✅ | ✅ |
| 儲值退費 | ❌ | ✅ |
| 查看儲值餘額／交易紀錄 | ✅ | ✅ |

沿用既有 `requireOwnerForAction()`／`requireOwnerUser()` 單一判斷
來源，不重複寫權限檢查。

---

## 7. Migration 規劃（草案，待確認後才建檔套用）

```sql
-- 1. 銷售歸屬
ALTER TABLE public.stored_value_topup_orders
  ADD COLUMN sold_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- 2. 流水帳補欄位（去正規化：plan_id/sold_by 直接放這裡，見 B.3 說明）
ALTER TABLE public.stored_value_transactions
  ADD COLUMN plan_id uuid REFERENCES public.stored_value_plans(id) ON DELETE SET NULL,
  ADD COLUMN sold_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN expires_at timestamptz; -- 贈額到期預留，這輪一律 NULL

-- 3. 補「作廢回沖」type
ALTER TABLE public.stored_value_transactions
  DROP CONSTRAINT stored_value_transactions_type_check,
  ADD CONSTRAINT stored_value_transactions_type_check
    CHECK (type IN ('topup','consume','refund','adjustment','void_reversal'));

-- 4. 儲值購買付款拆分（見 B.1，若你選擇不要混合付款能力，這張表不建，
--    改用 stored_value_topup_orders.payment_method 單一欄位即可）
CREATE TABLE public.stored_value_topup_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topup_order_id uuid NOT NULL REFERENCES public.stored_value_topup_orders(id) ON DELETE RESTRICT,
  method         text NOT NULL CHECK (method IN ('cash','ecpay_credit','ecpay_transfer')),
  amount         int NOT NULL CHECK (amount > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 5. 種子資料：三階方案（金額見 stored-value-rules.md）
INSERT INTO public.stored_value_plans (tier, name, principal_amount, bonus_amount, sort_order) VALUES
  ('暖心', '暖心會員', 5000, 200, 1),
  ('沐光', '沐光會員', 10000, 750, 2),
  ('御藏', '御藏會員', 20000, 1750, 3);
```

`checkouts.stored_value_principal_used` / `stored_value_bonus_used`
不需要 migration，Phase 1 已經有。

---

## 8. 測試計畫

- **`allocateStoredValueDeduction`**：贈額優先扣、贈額用完才扣本金、
  金額剛好等於贈額（本金完全不動）、金額超過贈額+本金總和的邊界
  （呼叫端要擋，函式本身怎麼表現也要測）。
- **鐵律延伸**：儲值支付（含贈額）的訂單，抽成仍按 face_value（見
  3.4）。
- **餘額不可為負**：扣款金額大於可用餘額時擋下送出。
- **退費**：只退本金、贈額同步歸零、帳戶保留（歸零後還能再儲值）、
  沒有本金時的邊界案例文案正確。
- **作廢回沖**：`void_reversal` 正確加回本金/贈額，不影響
  `refund`（客退）類型的既有邏輯，兩者在同一個客人帳戶上不會互相
  干擾。
- **銷售歸屬彙總查詢**（B.3）：造測試資料驗證「按人按月加總本金
  銷售額」查詢結果正確，含「同一師傅跨月」「不同師傅同月」「線上
  購買 sold_by 為 NULL 不算進任何人」三種案例。
- **日結報表**：儲值收入只算本金（現金流入），贈額不算進現金流入
  數字；儲值消耗不重複加進當日營收。
- **權限邊界**：manager 呼叫方案設定/退費 action 被擋，owner 可以；
  manager 可以正常執行儲值購買與結帳扣款。
- 既有 172 個測試案例不得變紅。
