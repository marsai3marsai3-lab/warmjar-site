# 溫罐子後台 — 設計決策紀錄

> 慣例（本檔案建立時定案）：每個 Phase 開工前，先把頁面結構／佈局／
> 有爭議的設計決策寫成草案，落檔到本檔案或該 Phase 專屬的
> `docs/phase-*.md`，等老闆確認後才動工實作。已拍板的決策留在本
> 檔案當歷史紀錄；還在討論中的大型草案（例如整頁佈局）另開獨立
> 檔案，定案後把結論摘要回填到這裡並附連結。不再只留在對話紀錄裡，
> 避免下一輪／換人接手時要重新考古。
>
> 資料庫層的決策紀錄沿用 `supabase/schema-draft.md`（表結構）與
> `supabase/testing-notes.md`（架構決策，例如 RLS／Realtime 的取捨）
> 既有的做法，本檔案只放「跟頁面/流程設計有關、不屬於單一表結構」
> 的決策。

## 2026-07-10 — Phase 3-2 收官決策

### 自查缺口全數採納，排入 Phase 3-3
Phase 3-2 驗收時工程端自查發現三個缺口，已確認排入 Phase 3-3（見
[phase-3-3-members-draft.md](phase-3-3-members-draft.md) C 節）：
1. 預約詳情面板缺「改期/換師傅」操作。
2. 已付訂金缺「退款」後台操作。
3. 客人跨日期預約歷史查詢——併入會員詳情頁的「預約歷史」分頁，不
   另外做一個獨立的查詢頁面。

### 上線前基礎設施併為獨立 Phase
以下四項因為都是「正式環境能不能跑」的必要條件、彼此高度相關，
決議合併成一個獨立 phase，排在會員／儲值等業務功能 phase 之後、
正式上線之前執行，不阻塞業務邏輯開發：
- 簡訊商（SMS provider）串接——目前 `send-otp` 是 dev-mode 直接把
  驗證碼回傳在 API response 裡（見
  `src/app/api/book/send-otp/route.ts` 註解）。
- lazy-expire 排程——目前只有「寫入前的被動檢查」（INSERT 前先跑
  一次），沒有背景排程去清理「建立後就沒人再碰」的過期
  `pending_deposit`。
- 正式環境 SMTP。
- Vercel 環境變數規劃。

不指定分配優化（目前一律揀 `availableStaffIds[0]`，無負載平衡）
優先度較低，留在業務功能 phase 之後、上線前基礎設施 phase 之前的
某個打磨階段再排，不併入上線前基礎設施（那四項是「不做就無法上
線」，這項是「能上線但不夠聰明」，性質不同）。

### 文件慣例變更
往後每個 Phase 開工前的頁面結構／佈局草案，一律先落檔到
`docs/phase-*.md`，經確認後才實作。

## 2026-07-11 — Phase 3-3 開工前決策（回覆 phase-3-3-members-draft.md E 節）

### E.1 服務紀錄照片：本輪只做 UI 占位，綁定 Phase 6 同意書機制
確認採納草案建議，不接 Supabase Storage。理由補充：服務紀錄照片可能
涉及顧客身體部位，屬敏感個資，**上傳功能正式開放前必須先有電子同意書
機制**（客人簽署同意拍攝後才開放上傳），這是 Phase 6（會員/LINE 整合
相關）的既定範圍。存取權限（誰看得到）與保存政策，屆時跟同意書機制
一併設計，不在 Phase 3-3 提前決定，避免兩邊互相牽制。`member_notes`
先只留 `photo_urls text[]` 空欄位。

### E.2 累計消費：採納「N/A」方案
列表頁顯示「N/A（尚未結帳上線）」，Phase 4（結帳/儲值相關）接上真實
`checkouts` 資料後才顯示實際金額。

### E.3 爽約篩選：拆成兩個獨立選項，都要做
不是二選一。會員列表頁篩選器同時提供：
- 「目前需付訂金」（預設，呼叫既有 `evaluateDepositPolicy`，語意是
  「/book 現在會不會要求他付訂金」）。
- 「曾有爽約紀錄」（單純查 `appointments.status='no_show'` 是否存在
  過任一筆，語意是歷史事實，不因後續完成一次預約而消失）。

會員詳情頁比照辦理：「目前訂金狀態」與「歷史 no_show 次數」兩者都
顯示，不合併成一個數字。

### 路由與範圍確認
`/admin/members/[id]` 獨立路由（非 slide-over）照草案定案。Phase 3-3
依 phase-3-3-members-draft.md 開工，91 個既有測試案例不得變紅。

## 2026-07-11 — Phase 3-3 驗收：流程教訓與收官

### 教訓：「後端 action 完成」不等於「前端已接線」
驗收發現「標記退款」的 Server Action（`markDepositRefunded`）跟權限
檢查（`requireOwnerForAction`）都已正確實作並有單元測試，但完成報告
說「已實作」時，實際上只接進了會員詳情頁一個入口，
`AppointmentDetailPanel`（行事曆的預約詳情面板）完全沒有這顆按鈕
——不是條件寫錯，是整段 UI 从未存在。往下查，行事曆那條路由樹
（`calendar/page.tsx` → `CalendarView` → `AppointmentDetailPanel`）
從頭到尾沒有把 `profile.role` 傳下去，是結構性缺口，不是這一顆按鈕
單獨的失誤——只是這次剛好只有退款按鈕撞上它，換成任何其他 owner
限定操作接在這條路由樹上都會犯一樣的錯。

**根因**：一個含 UI 的功能有多個入口時，「後端邏輯做完＋測試綠燈」
很容易讓人（包含我自己）誤以為功能已完成，但單元測試只覆蓋純函式
邏輯，不會發現「元件根本沒 import 這顆按鈕」或「prop 沒往下傳」這種
接線層級的遺漏——這正是這個專案目前完全沒有 component-level 測試
（見 CLAUDE.md 開發紀律，vitest 只測純函式）的已知盲區，短期內不
打算引入 React Testing Library，所以這類遺漏只能靠人工驗收跟完成
報告的紀律來擋。

**往後規則**（即日生效，適用所有含 UI 的功能）：
1. 完成報告必須**逐一列出每個 UI 入口**的接線狀態（例如「入口 A：
   已接線；入口 B：已接線」），不能只寫「OOO action 已實作」帶過，
   即使兩個入口理論上該共用同一顆按鈕/同一份邏輯。
2. 若同一個操作有多個入口，優先把顯示條件跟呼叫邏輯**抽成共用
   pure 函式／共用元件**（例如這次修復抽出的 `canShowRefundButton`
   + `RefundDepositButton`），單一入口各自寫一份重複邏輯是這類漏洞
   的溫床。
3. 本機驗收指南必須包含**每顆按鈕的實測步驟**（不是只寫「測試訂金
   相關功能」），涵蓋：按鈕在哪個頁面/入口、預期在什麼角色/狀態組合
   下出現、按下去之後的預期結果。

### Phase 3-3 正式完成
會員管理第一批（列表、詳情、標籤、黑名單、內部評分、服務紀錄占位）
與 Phase 3-2 三個缺口（改期/換師傅、退款標記、跨日期預約歷史查詢）
全數完成並通過 owner/manager 雙帳號驗收，118 個測試案例全綠。

### 已知待辦總表（更新）

**本輪已清：**
- ✅ 改期/換師傅（Phase 3-2 缺口一）
- ✅ 已付訂金退款標記（Phase 3-2 缺口二，含本次接線修復）
- ✅ 客人跨日期預約歷史查詢（Phase 3-2 缺口三）
- ✅ 會員管理第一批（列表/詳情/標籤/黑名單/評分/服務紀錄占位）
- ✅ owner/manager 權限第一刀（`requireOwnerForAction`）

**Phase 3-3 新增、留給後續 phase 的待辦：**
- 累計消費真值——目前列表頁固定顯示「N/A（尚未結帳上線）」，
  Phase 4（結帳/儲值）接上 `checkouts` 資料後才顯示實際金額。
- 服務紀錄照片上傳——UI 占位，綁定 Phase 6 電子同意書機制才開放
  （見本檔案 2026-07-11 E.1 決策）。

**仍掛著，未變動：**
- 簡訊商（SMS provider）串接、lazy-expire 排程、正式環境 SMTP、
  Vercel 環境變數規劃——四項合併的「上線前基礎設施」phase，排在
  業務功能 phase 之後、正式上線之前。
- 不指定分配優化（`availableStaffIds[0]` 無負載平衡）——優先度低，
  排在上線前基礎設施 phase 之前的打磨階段。

## 2026-07-12 — Phase 4 開工前決策（回覆 phase-4-checkout-draft.md §5）

### §5.1 抽成率優先序：採納「服務優先」
`staff_service_skills.commission_rate_override` > `services.default_commission_rate`
> `staff.default_commission_rate`，照草案建議定案。**附加要求**：抽成率
設定介面必須顯示「目前生效值與其來源層級」（例如
`35%（來自：陳師傅×油壓 個別設定）`），不能只顯示數字讓使用者自己
反推是哪一層在生效——這條連帶影響 UI 設計，`commissionRate` 解析函式
要回傳來源層級標籤，不能只回傳數字。

### §5.2 訂金沒收：定案為「標記爽約時手動確認，預設勾選」
不是自動沒收，也不是完全獨立於 no_show 流程的動作，而是**掛在
no_show 確認框上**：若該預約有 `status='paid'` 的訂金，確認框內附帶
「同時沒收訂金 NT$XXX」勾選項，**預設勾選、可取消**（保留人情彈性
——例如客人事後聯繫改期，店員可以取消勾選，訂金維持 `paid` 不動）。
沒收動作：`deposit_records.status → 'forfeited'`、寫一筆
`revenue_records`（`revenue_type='forfeited_deposit'`）、寫
`audit_logs`。既有的 waive／退款機制（Phase 3-2/3-3 已實作）完全不受
影響，三者是互斥但各自獨立的訂金終態路徑。

### §5.3 折扣拆分：報表先合併，資料結構留擴充空間
`checkouts.discount_amount` 維持單一合併欄位，不拆項目折扣/整單折扣
兩個數字。草案裡的折扣分攤演算法（最大餘數法）本來就是在
`checkout_items` 層級記錄每項的 `paid_amount`，已經是「按項記錄」的
細粒度，之後如果要拆報表不需要動資料結構，只是查詢邏輯的事。

### §5.4 客數：結帳筆數，報表欄位命名避免混淆
採 `count(checkouts)`（結帳單數，不是不重複來客數），但日結報表上的
欄位名稱定為「**結帳筆數**」而不是「客數」，避免使用者誤讀成不重複
來店人數。

### 五個 schema 缺口全數確認修補
`checkout_payments` 表、`deposit_records.applied_checkout_id`、
`checkouts`/`commission_records` 的作廢相關欄位、`services` 的服務層
抽成欄位、訂金沒收依 §5.2 決策接上——全部排入 Phase 4 migration。

Phase 4 依 phase-4-checkout-draft.md 開工，118 個既有測試案例不得
變紅，「折扣價付款、抽成仍按 face_value 計算」的鐵律測試為必要
交付項目。

## 2026-07-12 — Phase 4 驗收通過 + 後台帳號顯示/登出，收官

### Phase 4 正式完成
結帳（POS）與抽成系統四劇本（權限頁面層級防禦、鐵律抽成、作廢重開、
爽約沒收）驗收全數通過，172 個測試案例全綠（含驗收後新增的帳號選單
相關測試）。過程中發現並修掉一個不屬於 Phase 4 範圍、但被 Phase 4
觸發的既有 bug：`canStaffPerformAllServices` 誤用「整張
`staff_service_skills` 表是否為空」判斷「這位師傅是否視為全能」，
應該是「這位師傅自己有沒有列」——已修正並補回歸測試，細節見
`fix: staff_service_skills capability check must be scoped per-staff`
commit。

### 後台帳號顯示與登出
`/admin` 頂部 bar 新增帳號選單：顯示 `display_name`（或信箱）＋角色
標籤（店主/店長），手機寬度收成頭像圓點、點開一樣看得到完整資訊，
含登出按鈕，manager/owner 都看得到自己的身分——共用裝置確認「現在
是誰登著」的安全功能。技術細節：把 `proxy.ts` 的受保護路徑判斷抽成
`isProtectedPath()` 獨立測試（原本直接寫死在 middleware 裡，不好單元
測試），「登出後訪問 /admin 被導回 /login」這條規則本身現在有測試
覆蓋，但**不是**真的模擬瀏覽器登出再訪問（專案沒有 E2E 框架），這點
驗收時請手動確認一次實際登出行為。

### 已知待辦總表（更新）

**本輪已清：**
- ✅ 結帳（POS）流程（行事曆帶入／walk-in 兩入口、同店到訪合併、
  項目折扣＋整單折讓、混合付款、訂金自動折抵）
- ✅ 抽成三層解析（師傅×服務個別設定／服務預設／師傅保底）＋
  「目前生效值與來源層級」顯示
- ✅ 訂金沒收（標記爽約時手動確認，預設勾選）
- ✅ 作廢重開狀態機（含 commission_records 同步作廢、訂金釋放可
  重新折抵）
- ✅ 日結報表（當日營收／訂金收入含沒收／師傅業績抽成／結帳筆數）＋
  CSV 匯出
- ✅ 累計消費真值（Phase 3-3 留下的待辦，這輪接上）
- ✅ 後台帳號顯示與登出
- ✅ 附帶修掉 `staff_service_skills` 全域 fallback 的既有 bug

**Phase 4 新增、留給後續 phase 的待辦：**
- `checkouts.status='refunded'`（服務已完成、事後全額退費）——schema
  已有這個狀態值但這輪刻意不實作，跟「作廢重開」是不同流程，涉及
  要不要連動退抽成、退預約狀態等更複雜的政策問題，留到有明確需求
  再設計（見 phase-4-checkout-draft.md 3.3）。
- `commission_settlement_batches`（月結/週結批次）——表在 Phase 1
  就設計好，但目前只做到「結帳當下逐筆算好 commission_records」，
  還沒有「批次標記已請款/已發放」的介面，供對帳發薪用，排到抽成
  相關的後續 phase。
- `checkout_payments`／`checkouts.payment_method` 的 `stored_value`／
  `coupon` 兩個付款方式——CHECK 約束已放進去，UI 先不開放輸入，
  等儲值 phase 上線一起接。

**仍掛著，未變動：**
- 簡訊商（SMS provider）串接、lazy-expire 排程、正式環境 SMTP、
  Vercel 環境變數規劃——四項合併的「上線前基礎設施」phase。
- 不指定分配優化（`availableStaffIds[0]` 無負載平衡）——優先度低。
- 服務紀錄照片上傳——綁定 Phase 6 電子同意書機制。

## 2026-07-13 — Phase 5 儲值方案系統驗收通過，收官

### Phase 5 正式完成
三階儲值方案（暖心 5000→5200／沐光 10000→10750／御藏 20000→21750）
四劇本（方案權限、混付儲值、贈額優先扣款、作廢回沖原路退回、退費
按鈕邊界、負債報表呈現）驗收全數通過，184 個測試案例全綠（+12，
含鐵律延伸測試與退費按鈕隱藏邊界測試）。

開工前三項決策（回覆使用者訊息，非草案原案）：
1. **B.1 收款機制**：採納建 `stored_value_topup_payments` 表，儲值
   購買支援現金+刷卡混合付款，UX 與結帳付款組合一致。
2. **5.1 呈現方式**：分頁（第五個 tab）+ 會員詳情頁頭部常駐顯示
   儲值餘額摘要（一行，principal+bonus 合計，餘額 0 或無帳戶不
   顯示）——理由是櫃檯 3 秒判斷場景，不該多點一層才知道客人有沒有
   儲值。
3. **§4 退費按鈕邊界，推翻原草案設計**：`principal_balance = 0` 時
   退費按鈕**直接不顯示**（不是原草案的「顯示但改文案/disabled」）。
   本金為 0 時，退費唯一效果是清掉客人的贈額，沒有正當使用場景，
   只會製造糾紛。`canShowStoredValueRefundButton(isOwner, principalBalance)`
   在此條件下回傳 `false`，有專門測試覆蓋（見
   `storedValueRefund.test.ts`）。

實作時額外自行判斷、不在草案明文範圍但延續既有慣例的一項：四個
金錢異動路徑（儲值購買、結帳扣款、退費、作廢回沖）一律**流水帳先
寫、餘額快取後更新**——萬一中途失敗，寧可留下「有流水沒扣餘額」的
可追蹤狀態，也不要「餘額扣了但流水沒寫」的錢追不回來，呼應本檔案
一貫「彙總表是可重算的快取，流水帳才是唯一真相」的原則。

### 已知待辦總表（更新）

**本輪已清：**
- ✅ 方案設定（owner 限定，三階金額/贈額/啟用開關可調，不可刪除）
- ✅ 後台儲值購買（現金+刷卡混合付款，含銷售歸屬 `sold_by`）
- ✅ 結帳儲值扣款（贈額優先，可與現金/刷卡混合湊足應收金額）
- ✅ 作廢已用儲值結帳單的回沖（`void_reversal`，跟客人主動退費
  `refund` 語意分開，各自有獨立流水類型）
- ✅ 退費（owner 限定，只退本金、贈額同步歸零，本金=0 時按鈕不顯示）
- ✅ 會員詳情頁儲值摘要（頭部常駐一行）＋第五分頁明細與操作
- ✅ 會員列表「有儲值餘額」篩選
- ✅ 日結報表儲值收入/消耗兩個負債框架區塊＋CSV
- ✅ 鐵律測試延伸：儲值支付（含贈額）不影響抽成的 face_value 計算
- ✅ `checkout_payments`／`checkouts.payment_method` 的 `stored_value`
  選項正式開放（Phase 4 遺留待辦，這輪接上）

**Phase 5 新增、留給後續 phase 的待辦：**
- **線上購買 ECPay 接口**——草案 B.2 已預留資料流設計
  （`stored_value_topup_orders.payment_method`／`ecpay_trade_no`
  欄位、`status` 狀態機都已就緒，`applyStoredValueTopup` 是刻意抽出
  的共用入帳函式，未來 webhook 直接呼叫即可），但本輪只做後台現場
  收款，不接 ECPay 金流，留到金流相關 phase 一起做。
- **師傅銷售儲值獎金月結計算**——`stored_value_transactions` 已補
  `plan_id`／`sold_by` 兩欄去正規化，按人按月彙總本金銷售額的查詢
  已驗證可行（見 stored-value-rules.md 門檻獎金規則：月累積
  30000/50000/80000 對應 300/800/1500，取最高達標階非累加），但
  「當月累積」與「門檻獎金」的計算與報表本輪刻意不做，留到抽成
  結算批次（`commission_settlement_batches`）相關 phase 一併處理
  ——跟 Phase 4 遺留的「月結/週結批次介面」是同一個後續 phase 的
  範圍，不要拆開設計。

**仍掛著，未變動：**
- `checkouts.status='refunded'`（服務已完成、事後全額退費）。
- 簡訊商（SMS provider）串接、lazy-expire 排程、正式環境 SMTP、
  Vercel 環境變數規劃——四項合併的「上線前基礎設施」phase。
- 不指定分配優化（`availableStaffIds[0]` 無負載平衡）——優先度低。
- 服務紀錄照片上傳——綁定 Phase 6 電子同意書機制。

## 2026-07-14 — Phase 6 開工中間決策：cron 頻率偏離採納、lazy-expire 清償

> Phase 6（LINE 整合）尚未驗收完成，本條目只記錄開工過程中幾項確認
> 採納的技術決策與待辦帳本異動，不是 phase 收官條目。收官條目待真機
> 驗收（LINE 綁定/推播）通過後另補。

### cron 執行頻率偏離原草案，正式採納
草案（phase-6-line-integration-draft.md B.5）原本設計
`/api/cron/notifications` 固定時間觸發（UTC `0 12 * * *`，對應台灣時間
每天 20:00 一次）。實作時偏離為「cron 每 15 分鐘跑一次＋runtime 用
`isWithinScheduleWindow` 判斷現在是否落在
`system_settings.notification_schedule` 設定的時段 ± 容許誤差內」（見
`notificationSweep.ts` 該函式註解）。理由：Vercel Cron 的觸發時間寫死在
`vercel.json`，改時間要重新部署；改成「頻繁執行 + 資料庫時段判斷」後，
後台調整提醒／關懷發送時段當天生效，不用重新部署。`deposit-sweep`
比照用 `*/10`，對應 30 分鐘訂金保留時長，容許誤差抓法一致。此偏離
已確認採納，列為定案，不是待審技術債。

### 新增上線前基礎設施待辦：Vercel 方案需升級 Pro
上述頻率（`*/15`、`*/10`）超出 Vercel **Hobby** 方案 cron 「每天最多
觸發一次」的限制。**正式上線前必須把 Vercel 專案升級到 Pro 方案**，
否則兩支 cron route 在 production 不會照 `vercel.json` 設定的頻率
觸發。併入 2026-07-10 條目定義的「上線前基礎設施」待辦帳本，記為新增
第五項（原四項：簡訊商串接、lazy-expire 排程、正式環境 SMTP、Vercel
環境變數規劃）。

### lazy-expire 排程正式清償
2026-07-10 條目起掛帳、Phase 4／Phase 5 收官時都仍列在「仍掛著」清單
的 lazy-expire 排程（背景清理過期未付款的 `pending_deposit`），這輪
因為本來就要建 Vercel Cron 基礎設施，依草案決策 2，併進
`runDepositCronSweep`（`/api/cron/deposit-sweep`）一次做掉：真正過期的
`pending_deposit` 轉 `cancelled` 並釋放時段，跟 `deposit_expiring_soon`
提醒共用同一支 10 分鐘頻率 cron。掛了三個 phase 的待辦正式清償，往後
「上線前基礎設施」待辦帳本只剩：簡訊商串接、正式環境 SMTP、Vercel
環境變數規劃、（新增）Vercel Pro 方案升級。

### revisit_care 文案定稿
老闆定稿文案已寫入 `message_templates` 種子（`supabase/migrations/
20260714000010_phase_6_line_integration.sql`），移除原草稿的「預約
回訪」按鈕與連結——**關懷訊息徹底去銷售化**，是既定店務策略：客人要
約會自己從圖文選單進，關懷訊息不挾帶任何銷售動作，呼應 CLAUDE.md
業務規則 3「隔日回訪＋前一日提醒」背後的營運洞察脈絡。往後同類
情感／關懷性質範本比照此原則，預設不掛連結，除非老闆明確要求。

## 2026-07-15 — Stage 6A-1（推播骨架）程式面完成，狀態：待真機驗收

> 承 2026-07-14 條目：Phase 6 與夯客 HOTCAKE 並存策略定案為拆分
> Stage 6A（純推播 + LIFF，零衝突）/ Stage 6B（全面取代，掛帳延後），
> 過程見 [phase6-stage-split-design.md](phase6-stage-split-design.md)
> （v2.1）與其對應的 [phase6-stage-split-review.md](phase6-stage-split-review.md)
> 落差審查。本條目記錄 Stage 6A-1 的程式面交付狀態，**不是驗收通過
> 條目**——驗收待真機測試通過後另補收官條目。

### 程式面：244 個測試案例全綠（+25），tsc / lint / build 全過
落地範圍：Config 拆分（`getLineCoreConfig()` 不再是 channelId／
channelSecret／access token 三者綁死的 all-or-nothing gate）、
Token Manager（stateless v3 token 動態發行 + 記憶體快取 +
`LINE_CHANNEL_ACCESS_TOKEN` 降為過渡期 fallback）、unfollow 反應式
偵測（`GET /v2/bot/profile/{userId}` 前置檢查取代原本設想但技術上
不可行的「Push API 錯誤碼判斷封鎖」，見 design 文件 §2.3 的查證
紀錄）、解封鎖恢復路徑（LIFF 登入成功時清除 `line_notify_blocked`）、
額度監控（日結報表新增「LINE 訊息額度」區塊）。細節與偏離草案說明見
`phase6-stage-split-design.md` v2.1 全文。

### 驗收指南已落檔，待執行
[phase6-stage6a1-acceptance-guide.md](phase6-stage6a1-acceptance-guide.md)
（逐按鈕真機實測腳本，對應 design 文件 v2.1 驗收標準 1–7 項）已入庫，
狀態「待執行」。

### 阻擋項：LINE Developers Console 權限尚未認回
驗收指南「零、前置條件」第一項——老闆需先確認能登入
developers.line.biz 看到溫罐子 Messaging API channel（ID:
2004034061）——目前未清償，是唯一擋著驗收開始的前置條件（其餘
`.env.local`／cloudflared／測試帳號等前置條件不受此影響，可以先
備妥）。此項清償後才能排真機驗收，通過後 Stage 6A-1 正式收官、
Stage 6A-2（電子同意書）開始排設計草案。

## 2026-07-16 — Console 權限完全認回；長期風險登錄；LINE 平台改制（LIFF 遷移）因應

### 帳本登錄一：Console 權限進度更新，2026-07-15 條目的阻擋項解除
Provider（#溫罐子，2002675868）Admin 權限、Messaging API channel
（2004034061）Admin 權限均已取得，Channel ID 已核對無誤。
`phase6-stage6a1-acceptance-guide.md`「零、前置條件」第一項可以打勾，
真機驗收排程不再被這項卡住。

另登錄一項新發現：該 Provider 底下除了溫罐子的 Messaging API channel，
還有夯客既有的 **LINE Login channel「溫罐子」（狀態 Published）**——
這支比照夯客既有 LIFF app 的既定禁碰邏輯，列入禁碰清單，不編輯、不
刪除、不誤觸任何設定。已同步寫進 `phase6-stage-split-design.md` v2.2
與驗收指南的禁區清單。

### 帳本登錄二：長期風險條目——channel 掛在夯客 Provider 底下，列為 Stage 6B 前置談判事項
溫罐子 Messaging API channel（2004034061）掛在**夯客所有的** Provider
（2002675868）底下，不是掛在溫罐子自己名下的 Provider。LINE 不支援
channel 跨 Provider 轉移，userId 綁定在 **Provider 層級**（查證見
`phase6-stage-split-design.md` v2.2 §一：同一 Provider 底下不管
LINE Login 或 Messaging API channel，同一使用者的 userId 都是同一個
值；換了 Provider 就是另一個值）。這代表 Stage 6B（終止夯客合約、
全面接管）真正執行時，若夯客把整個 Provider 收回或刪除，溫罐子會連帶
失去這支 channel 跟已經累積的所有客人 userId 綁定關係——不是「重新
申請一個新 channel」就能解決的問題，因為換了 Provider 全部客人的
userId 都會變成不同值，等同會員 LINE 綁定全部歸零重來。

**標記為 Stage 6B 前置談判事項，優先序高於「夯客合約到期日確認」**：
終止合約前，必須以**書面**（不能只是口頭承諾）向夯客確保兩件事——
(a) 溫罐子在該 Provider 的 Admin 權限持續保留；(b) channel 與
Provider 本身不會被刪除或收回。就算合約到期日確認了、切換時點排定
了，若沒有這份書面保障，終止合約當下就有直接弄丟全部客人 LINE 綁定
關係的風險，這條必須排在 Stage 6B 啟動前先談攏，不能等到切換 Runbook
階段才處理。

### 平台變更因應：LINE 改制，Messaging API channel 不可再新增 LIFF app
LINE 官方公告 Messaging API channel 不可再新增 LIFF app（Console 已
實地確認），推翻原始 `phase-6-line-integration-draft.md` A.0「LIFF 要
建在 Messaging API 頻道底下，不要另開 LINE Login 頻道」的操作指示——
不是那條指示當初寫錯，是平台後來不允許這樣做了。

設計文件更新為 v2.2（見 `phase6-stage-split-design.md`），核心因應：
自建 LIFF 改掛**自建的 LINE Login channel**（`warmjar-booking`），但
必須跟 Messaging API channel 建在**同一個 Provider**（2002675868）
底下才能保住同一份 userId——真正的判準是 Provider 層級，不是
channel 層級，v2.2 順手訂正了 A.0 原本「channel 層級」的不精確判準
（A.0 的操作結論當初剛好因為 LIFF 天然跟 Messaging API channel 同一個
Provider 而「湊巧正確」，但寫的理由不夠精確）。

程式面對應改動：`verifyLineIdToken` 的 idToken 驗證 audience 改讀新
環境變數 `LINE_LOGIN_CHANNEL_ID`（自建 Login channel 的 Channel ID），
不再用 Messaging API 的 `LINE_CHANNEL_ID`。`.env.example`（新建，之前
專案沒有這份文件）與 `.env.local` 同步新增這個變數的說明。測試面：
`lineClient.test.ts` 的 idToken 驗證案例改為驗證 audience 使用
`LINE_LOGIN_CHANNEL_ID`，並新增一筆「即使 Messaging API 的
LINE_CHANNEL_ID/SECRET 都有設定，缺 LINE_LOGIN_CHANNEL_ID 依然失敗」
的案例，證明兩者是獨立的組態來源。245 個測試案例（+1）、tsc / lint /
build 全過。驗收指南（`phase6-stage6a1-acceptance-guide.md`）同步
更新前置條件（Console 操作改三件事）與 LIFF 綁定驗收區（補一步驗證
跨 channel userId 一致性）。

## 2026-07-17 — LIFF 本機開發慣例：禁用 localhost 測試、必設 allowedDevOrigins

> Stage 6A-1 真機驗收前，本機用 cloudflared quick tunnel 測 LIFF 綁定
> 流程時排查出的兩個環境設定陷阱，皆非程式邏輯 bug，記錄下來避免下一
> 輪（或 6A-2、6B）重新踩雷。兩條都只影響本機開發環境，不影響正式
> 環境（正式網域本身就是 LIFF Endpoint URL，不會有這裡的落差）。

### 慣例一：LIFF 本機測試一律用 cloudflared 通道網址，禁止直接開 localhost
排查 `/member` 卡在「連接 LINE 中」不動時，dev server log 的
`[browser]` 轉發訊息直接抓到：

```
[browser] [WARN] liff.init() was called with a current URL that is not related to the endpoint URL.
http://localhost:3000/member is not under https://{通道網址}/member
```

用 `http://localhost:3000/member` 測試時，`liff.init()` 偵測到目前
網址跟 LINE Console 登記的 LIFF Endpoint URL（通道網址）不同源，只印
一句 `console.warn`，不拋錯、不 reject，完全繞過任何逾時/錯誤保護。
後續 `liff.login()` 確實會觸發 LINE OAuth 跳轉，但因為登入在
`localhost` origin 發起、卻在通道網址這個不同 origin 完成回呼，LIFF
存 OAuth state 用的 browser storage 是依 origin 隔離的，兩個 origin
讀不到彼此的 state，導致驗證失敗、`isLoggedIn()` 又判定未登入、再次
觸發 `liff.login()`——形成靜默的登入迴圈（log 裡看得到同一組
`code`/`state` 連續打了 4 次），而不是單純卡住不動。**往後 LIFF 相關
功能本機測試，一律開通道網址（`https://{隨機字串}.trycloudflare.com/...`），
不要為了方便直接開 `localhost:3000`。**

### 慣例二：cloudflared 通道網域要加進 `allowedDevOrigins`
Next.js dev server 預設會擋掉非 `localhost` 來源對 dev-only 資源
（HMR websocket、`_next/static` chunk 等）的跨來源請求，log 裡對應
警告：

```
⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "{通道網址}".
```

影響不只 HMR 熱更新失效（改完程式碼，已開啟的通道分頁收不到更新，
等於在測一份舊版 JS，排查時很容易誤判「改的東西沒生效」），也可能
連帶影響其他 dev-only 資源的跨來源請求。已在 `next.config.ts` 加上：

```ts
allowedDevOrigins: ["*.trycloudflare.com"],
```

用萬用字元涵蓋整個 `*.trycloudflare.com`，因為 cloudflared quick
tunnel 每次重啟網址都會換一個新的隨機子網域，寫死單一網址下次重開
通道又要回來改設定——查證 Next.js 16.2.9 官方文件（`allowedDevOrigins`
config reference）確認這個版本本來就支援萬用字元子網域寫法，不是
自創語法。這個設定只在 dev 模式生效，不影響正式環境 build。

**往後規則**：LIFF／通道相關本機開發，這條設定視為既有基礎設施的
一部分，不用每個 Phase 重新設定一次；若改用 ngrok 或其他通道工具，
需要另外把該工具的網域樣式加進 `allowedDevOrigins`。

## 2026-07-18 — 驗收 1-2 發現的規格洞：後台代客建單補接 booking_confirmed 推播

### 排查過程：手動建單成功但收不到推播
真機驗收標準 1（Token Manager 煙霧測試）第一步卡關：`/admin` 手動建一筆
測試會員的預約，建單成功，手機完全沒收到推播。依 server log →
`notifications_log` → `profiles.line_user_id` → 程式路徑 四段逐一排查：

1. **server log**：`POST /admin/appointments/new` → `createManualAppointment`
   200，無任何錯誤，但也完全看不到任何推播嘗試的痕跡。
2. **`notifications_log`**：這筆預約查到 **0 筆**紀錄——不是「嘗試但失敗」，
   是根本沒呼叫過 `sendNotification`。
3. **`profiles`**：客人 `line_user_id` 有值、`line_notify_blocked = false`，
   綁定正常；比對過跟第二區完成 LIFF 綁定的是同一筆 `profile_id`，排除
   「選錯會員」或「綁定沒生效」的可能。
4. **程式路徑**：`src/app/admin/(ops)/appointments/new/_actions.ts` 的
   `createManualAppointment` 從一開始就沒有 import 或呼叫
   `sendNotification`——對照 `/book/create-appointment/route.ts`（顧客自助
   預約）才有接。原始草案 `phase-6-line-integration-draft.md` B.4 的觸發
   條件字面上只寫 `create-appointment` API，沒涵蓋後台建單，是規格範圍
   一開始就沒包進去的洞，不是既有程式碼的 bug；Token Manager／LIFF 綁定／
   §2.3 封鎖偵測這幾段驗證下來全部正常。

### 補洞決策：triggeredBy 沿用 system_event，不新增值
原本設想比照既有的 `admin_manual` 這個 triggeredBy 值，但核對後發現
`admin_manual` 已經是既有「會員詳情頁手動單發」功能專用（見
`src/app/admin/(ops)/members/_actions.ts`），且 `notifications_log` 的
`triggered_by` 欄位有 DB 層級 CHECK 約束（`supabase/migrations/
20260714000010_phase_6_line_integration.sql`），只允許
`system_cron`／`system_event`／`admin_manual` 三個值；`idx_notifications_log_dedupe`
唯一索引還刻意把 `admin_manual` 排除在防重複發送保護之外（因為既有的手動
單發功能就是要能對同一筆預約重複發）。若沿用 `admin_manual`，後台建單這裡
會混進既有手動單發的報表統計、還會失去防重複發送保護。

**確認採納**：`triggeredBy` 沿用 `/book` 那條路的 **`system_event`**（不
新增值、不用 migration）——語意上兩者都是「預約建立成功事件觸發」，不分
哪個 UI 建的單，且自動吃到既有 dedupe 保護。要分辨這筆通知是哪個 UI 觸發
的，改查 `appointments.source`（後台建單本來就有記 `walk_in`/`phone`/`admin`
等值），不靠 `triggered_by` 承擔這個責任。

### 程式面：新增 `notifyBookingConfirmed` 共用 helper
`src/lib/line/notificationSender.ts` 新增 `notifyBookingConfirmed(supabase,
{ customerId, relatedAppointmentId, vars }, send?)`——固定
`templateKey: "booking_confirmed"`、`triggeredBy: "system_event"`，內部
try/catch 吞掉失敗，不外露給呼叫端（比照 `/book/create-appointment` 既有的
fire-and-forget 慣例：推播失敗不得影響建單本身是否成功）。
`createManualAppointment` 建單成功、寫完 audit log 之後呼叫這支 helper。
新增 2 個測試案例（`notificationSender.test.ts` 246-247）：驗證呼叫參數
（templateKey/triggeredBy/customerId/relatedAppointmentId/vars）正確、驗證
`send` 拋出例外時 `notifyBookingConfirmed` 不外露例外。247 個測試案例（+2）、
tsc / lint / build 全過。

`docs/phase-6-line-integration-draft.md` B.4 觸發條件表補註（涵蓋後台建單
的決策紀錄）；`docs/phase6-stage-split-design.md` 新增 §2.7 記錄這次驗收發現
與補洞決策的摘要，兩處都指回本條目看完整脈絡。

### 掛帳登錄：後台建單的 deposit_payment_link 發送策略，列入 Stage 6A 收尾範圍
本輪刻意**不**處理 `deposit_payment_link`——後台代客建單目前一律直接
`confirmed`、不走訂金流程（臨櫃/電話當下就能決定，不用客人自己上 ECPay
付款頁），這個範本天生不適用現在的後台建單流程。但如果未來後台建單也要
支援「客人電話預約、店家後台建單、但仍需要客人自己付訂金」這種混合情境，
屆時要另外設計發送策略——不是單純技術問題，涉及**櫃檯溝通流程**（店員什麼
時候該告知客人「等一下會收到付款連結」、要不要在後台畫面上就先提示店員
這筆需要訂金等），需要另外跟老闆討論店務流程再排入設計。**列入 Stage 6A
收尾範圍待議**，不併入這輪最小版本補丁。

## 2026-07-19 — 驗收 1-3/1-4 排查發現：驗收指南寫了程式碼不存在的 log

### 發現：`phase6-stage6a1-acceptance-guide.md` 驗收 1-3「檢查 server log
有無 stateless token 發行紀錄」這條，`tokenManager.ts` 當時**完全沒有任何
console 輸出**——不管是快取命中、重新發行、還是降級用 fallback，一律靜默
進行。驗收步驟要求查一個根本不存在的證據，查了也查不到，跟「查了發現有
問題」是兩回事——這種情況下只能先間接驗證（查 `notifications_log` 兩筆
`booking_confirmed` 皆 `status='sent'`，反推 token 兩次都真的取得成功），
沒辦法直接回答驗收步驟問的問題。

### 補上對應 log，並訂為往後撰寫驗收步驟的紀律
`resolveAccessToken`（`src/lib/line/tokenManager.ts`）三個分支各補一行
console 輸出，統一前綴 `[tokenManager]`，**不輸出 token 值本身或任何片段**：
- 快取命中：`console.log("[tokenManager] cache hit")`
- 發行新 token：`console.log("[tokenManager] issued new token")`
- 降級用 fallback：`console.warn("[tokenManager] WARN: fallback to static
  token — stateless issuance may be failing")`——特意用 `warn` 且帶
  `WARN` 字樣，因為過渡期 fallback 本來就該是罕見事件，驗收/維運要能
  一眼從 log 等級跟字樣看出這不是正常路徑。

新增 3 個測試案例（`tokenManager.test.ts` 248-250），驗證三個分支真的有
呼叫對應的 `console.log`/`console.warn`，並額外斷言 fallback 那則 log
沒有洩漏 token 值本身。**這是專案目前唯一一組測 console 輸出的測試**——
其餘一律走純函式回傳值或 DI 注入斷言，特例理由是這幾行 log 存在的唯一
目的就是給真機驗收查 server log 用，不驗證「真的有印出來」的話，這個
功能自己就沒有測試覆蓋的意義。250 個測試案例（+3）、tsc / lint / build
全過。

### 往後規則：驗收步驟只能寫「程式實際有輸出的證據」
**寫真機驗收指南（或任何要靠查 log／查資料庫來判斷通過與否的驗收步驟）
之前，必須先確認證據來源真的存在**——不能假設「這種事應該會有 log
吧」就直接寫進驗收步驟。具體做法：寫驗收步驟前，先讀一次要驗證的那段
程式碼，確認要查的 log／欄位/紀錄是程式碼真的會產生的，不是預期會有、
應該要有，或憑印象覺得會有的。這次的落差不是驗收指南寫錯，而是撰寫當下
沒有回頭核對程式碼是否真的有這行輸出——往後補的原則同樣適用於「查
notifications_log 的某個欄位」「查 profiles 的某個標記」這類驗收步驟，
一併用這個標準檢查。

## 2026-07-20 — Stage 6A-1 真機驗收（首日）完成，待隔日複查

### 驗收結果：第 0、一、二、三、四、五區全數通過
依 `phase6-stage6a1-acceptance-guide.md` 逐項執行，關鍵證據：

- **第一區（Token Manager）**：`notifications_log` 兩筆 `booking_confirmed`
  皆 `status='sent'`；server log 第一筆 `[tokenManager] issued new token`、
  第二筆 `[tokenManager] cache hit`（且同一筆請求內部 checkReachable／push
  各自呼叫一次 `getAccessToken()`，也各自命中預期分支）；全程無
  fallback WARN。
- **第二區（LIFF 綁定）**：排查過程波折較多（見下方補洞項），最終跨
  channel userId 一致性、綁定/免 OTP 續登都驗證通過。
- **第三區（cron 提醒）**：3-2 正確 secret → `{"sent":1}`；3-4 錯誤
  secret → `401`；3-5 再觸發 → `{"sent":0}`，`notifications_log` 的
  `reminder_day_before` 只有一筆 `sent`，dedupe 正常。
- **第四區（封鎖偵測）**：`profiles.line_notify_blocked=true`、
  對應 `notifications_log` 該筆 `status='skipped'`、
  `error_message='profile_404'`，符合預期。
- **第五區（解封鎖恢復）**：解除封鎖＋重新 LIFF 登入後，
  `line_notify_blocked` 回到 `false`，之後一筆推播 `status='sent'`。

六、七區狀態依實際補記；七區（夯客迴歸檢查）7-5 要求隔日重複
7-1~7-3，**今天只能先做首日部分，正式判定待隔日複查**。

### 驗收過程中的補洞與強化（四項）
1. **後台建單原本沒接推播**——驗收 1-2 發現，補上
   `notifyBookingConfirmed`、`triggeredBy` 定案為 `system_event`，完整
   排查過程與決策見 2026-07-18 條目。
2. **`tokenManager.ts` 三分支補 log**——驗收 1-3/1-4 發現指南假設了
   不存在的證據來源，補上 `[tokenManager] cache hit` /
   `issued new token` / `WARN: fallback to static token`，完整脈絡見
   2026-07-19 條目。
3. **`MemberApp.tsx` 從單一「連接 LINE 中」改成四階段進度＋全程逾時
   保護**——真機排查「永久卡住、逾時從未觸發」時，逐層發現多個獨立
   問題疊加：
   - 原本只有 `liff.init()` 呼叫本身包 10 秒逾時，前面
     `await import("@line/liff")`（動態載入 SDK chunk）完全不在保護
     範圍內，chunk 載入卡住時逾時計時器根本沒被建立過。改成把「動態
     載入 SDK ＋呼叫 `init()`」整段包進同一個 `Promise.race`。刻意
     **不**改成 static import——client component 在 Next.js App Router
     底下 SSR 階段仍會執行一次，`@line/liff` 這類存取
     `window`/`navigator` 的瀏覽器 SDK 若在模組頂層 static import，
     很可能讓 `/member` 的 SSR 直接噴錯，這是原始草案
     （`phase-6-line-integration-draft.md` A.2）選擇動態 import 的
     既有理由，不是隨手挑的寫法。
   - `liff.login()` 呼叫後原本直接 `return`，沒有任何逾時／錯誤保護，
     若導頁沒真的發生會無聲卡住——加 5 秒逾時，逾時顯示具體錯誤跟
     可能原因。
   - 補 `mountedRef` 守衛，防止 React 開發模式 StrictMode 雙跑
     `useEffect` 時，「已被取代」的執行個體晚一步 resolve 蓋掉當下
     畫面狀態。
   - 畫面從單一「連接 LINE 中」拆成 `init`／`checking_login`／
     `redirecting`／`verifying` 四階段文字，每階段都能從畫面直接看出
     卡在哪一步，不用再靠猜。
   - 排查過程中意外抓到真正的路徑問題（見下一項）跟一個平台限制
     （`liff.init()` 對「目前網址跟 Endpoint URL 不同源」只印
     `console.warn`、不拋錯，這是 LINE SDK 官方行為，不是本專案能改的）。
4. **LIFF 本機測試環境慣例**——禁止直接開 `localhost` 測試（origin
   不一致會導致 OAuth state 跨 origin 讀不到、形成靜默登入迴圈）、
   `next.config.ts` 加 `allowedDevOrigins: ["*.trycloudflare.com"]`
   （不然 HMR 熱更新對通道網址整個失效，改的程式碼推不過去，排查時
   容易誤判「改的東西沒生效」）。完整脈絡見 2026-07-17 條目。

### `notification_schedule` 復原確認
查證 DB 現值：`{"revisit_care":"12:30","reminder_day_before":"20:00"}`——
`reminder_day_before` 已復原為 `20:00`，驗收期間為了測試改成的 `16:10`
沒有殘留。

### 狀態：待隔日複查，通過即正式關閉 6A-1
7-5（隔日重複 7-1~7-3：夯客自動回覆／Rich Menu／夯客預約通知）是唯一
還沒執行的項目，明天複查通過後 Stage 6A-1 才正式收官。

### 下一項：Stage 6A-2（電子同意書）設計草案排程
6A-1 正式關閉後開始排。範圍見
`phase6-stage-split-design.md` §2.5（簽名擷取／存檔版本控管／與服務
紀錄照片的依賴關係），本輪只定範圍未展開實作細節，需另立設計草案。

## 2026-07-21 — Stage 6A-1 隔日複查通過，正式關閉

### 複查結果：7-5 通過，完整營運日觀察無異常
唯一懸而未決的 7-5（隔日重複 7-1~7-3）今日執行，結果：
- 傳訊息給溫罐子 OA，夯客自動回覆與昨日基準一致，無異常。
- Rich Menu 顯示與功能與基準一致，未被本輪 Stage 6A-1 任何操作影響。
- 走一次夯客預約流程，夯客通知正常送達。
- 非僅單點抽查，而是完整營運日全程觀察（含當日一般客流時段的自然
  觸發），全程未見任何與基準的落差。

至此 `phase6-stage6a1-acceptance-guide.md` 零～八區、驗收標準 1–8
全數通過，其中第四區（夯客迴歸檢查）連續兩日抽查皆與基準一致，
符合驗收標準 4 要求的「隔日再抽查一次」。

### 收官摘要
LINE 推播全鏈路——Token Manager stateless token 發行（含快取命中／
到期重發）、`GetProfile` 推播前置檢查、封鎖偵測與解封後恢復路徑、
cron 提醒時段窗與 dedupe、額度監控數字顯示、LIFF 綁定與跨 channel
userId 一致性（同 Provider 下 Login channel／Messaging API channel
共用同一份 userId）——均已於真機驗證通過。全程雙日驗收（首日
2026-07-20 + 隔日 2026-07-21）夯客既有的自動回覆、Rich Menu、
預約通知三者皆與驗收前基準一致，**夯客零影響目標達成**，Stage 6A-1
範圍內未觸碰任何禁區資源（Webhook URL、long-lived token
Issue/Reissue、Rich Menu 建立、manager.line.biz 設定、夯客既有
LIFF／LINE Login channel）。

### 驗收結案總表（對照驗收標準 1–8）
1. Token Manager 煙霧測試（stateless token，非 fallback）——通過，見
   2026-07-20 條目第一區。
2. LIFF 綁定＋跨 channel userId 一致性——通過，見 2026-07-20 條目
   第二區。
3. cron 提醒推播（按時送達＋dedupe）——通過，見 2026-07-20 條目
   第三區。
4. 夯客迴歸檢查（首日＋隔日各一次）——通過，本條目＋2026-07-20
   條目。
5. 額度監控數字正確顯示——通過，見 2026-07-20 條目第六區。
6. unfollow 偵測（封鎖→標記→跳過推播）——通過，見 2026-07-20 條目
   第四區。
7. 解封鎖恢復路徑——通過，見 2026-07-20 條目第五區。
8. tsc / lint / build / 測試全綠（250 個測試案例）——通過，見
   2026-07-19 條目。

驗收過程中的四項補洞與強化（後台建單接推播、tokenManager 補 log、
MemberApp 四階段進度＋逾時保護、LIFF 本機測試環境慣例）已於
2026-07-20 條目記錄，不重複列出。

### 狀態：Stage 6A-1 已關閉
`phase6-stage-split-design.md` 頂部狀態與 `phase6-stage6a1-acceptance-guide.md`
同步改為「已關閉，驗收全數通過」。§五 待確認事項第 5 項（6A-2
排程時間點：立即接續或先觀察 6A-1 穩定）採「立即接續」處置——見下方。

### 帳本登錄：下一項啟動——Stage 6A-2（電子同意書）設計草案
6A-1 關閉，帳本推進至下一項：Stage 6A-2（電子同意書簽署）設計草案。
範圍延續 `phase6-stage-split-design.md` §2.5 已定的三個子項（簽名
擷取方式、存檔版本控管、與服務紀錄照片上傳的依賴關係），本輪展開
為獨立設計草案，尚未定案，暫不進入實作。

## 2026-07-22 — Phase 7-A 提前版（真實客人上線）設計定案

### 決策脈絡：乙案，Phase 7 部分提前
6A-1 關閉後，決議不等完整 Phase 7，先把「正式上線所需最小基礎設施」
提前做，讓已驗收通過的推播骨架服務真實客人。營運形態為雙軌並行：
客人預約管道照舊經夯客/電話，櫃檯在自家後台同步建單觸發推播；客人
透過自建 LIFF 自願綁定會員身分。完整設計過程與逐項裁決見
[phase-7a-early-launch-draft.md](phase-7a-early-launch-draft.md)（v2，
已定案），本條目只記錄收斂後的關鍵決策摘要，細節一律以該檔案為準。

### 關鍵決策摘要
- **正式資料庫**：新開獨立 Supabase organization「Warmjar-Booking」→
  專案 `warmjar-booking-prod`，**Free 方案**起步（推翻草案原本「沿用
  既有 organization」的建議）。Free 無自動備份，人工週匯出為第一階段
  主要防線，「風險有界」論證的精確範圍已載明（預約紀錄有夯客側備援，
  儲值/抽成/audit_logs 沒有）。Pro 升級硬觸發點：Stage 6B 前置作業
  啟動、資料轉正之前。
- **部署形態**：同 repo 新 Vercel Project，Production Branch
  `release/booking-prod`，正式子網域定案 **`book.warmjar.com.tw`**。
- **Cron 零成本起步變體**：Vercel Hobby 每日 1 次（20:05/20:10 台灣
  時間）+ GitHub Actions 補位 `revisit_care`（12:35）與
  `reminder_day_before`（20:05，與 Vercel 原生 cron 形成雙保險），
  已落地 `.github/workflows/notifications-cron.yml`。Vercel Pro 非
  第一階段必要項，觸發條件另定，發現並記錄了 `revisit_care` 在單一
  每日觸發下是「結構性完全不觸發」（不是容錯變差）這個技術落差。
- **ECPay**：維持 `staging`，新增 `system_settings.deposit_flow_enabled`
  開關（上線時關閉），不依賴「新資料庫天然沒有爽約歷史」這個會隨時間
  失效的巧合。
- **LIFF 首次綁定改走「櫃檯代客綁定」**（QR/深連結，完全跳過既有 OTP
  路徑，另開平行路徑不改既有程式碼），含單次失效的原子更新設計（重用
  `profiles.line_user_id` 從 NULL 變非 NULL 的天然狀態轉換，不新增表/
  索引）。三竹簡訊重新定位為 Stage 7-B 第一優先，解鎖遠端自助綁定
  （櫃檯代客綁定只解決臨櫃情境）。
- **緊急關閉開關**：`system_settings.push_enabled`（owner 限定），上線
  後若推播異常可秒停，不用等重新部署。
- **推播額度 gate：通過**——夯客現用 3,189 則 + 7-A 新增估算 600 則
  ＝3,789／6,000（高用量方案），約 63%，OA 方案本輪不需升級，監控線
  訂在 5,000 則。

### 狀態：設計定案，尚未實作
`phase-7a-early-launch-draft.md` 已產出依賴順序排列的實作工單拆解
（§9，Wave 0～3 + 條件工單），**等待明確下令才開工**，本條目登錄時
尚未動任何 Console／Vercel／Supabase 操作。

## 2026-07-22 — Phase 7-A 開工：雙軌範圍裁決 + Wave 1 完成

### 開工裁決一：雙軌期營運範圍限制
`warmjar-booking-prod` 這輪只啟用代客建單、推播、LIFF 綁定三件事，
**儲值購買與 POS 真實結帳暫不啟用**，掛帳，啟用前置條件是「每日備份
方案落定」（呼應 §1.4 的 Free 方案風險範圍論證——儲值/結帳資料正是
夯客側沒有備援的那一塊）。已核對 `/admin` 的結帳與儲值購買功能目前
沒有任何系統層級開關，依指示不新增只為過渡期用的 flag，改採營運紀律
（店員操作時不使用這兩個入口）+ 文件註明（見
`phase-7a-early-launch-draft.md` §0.1），本輪不新增任何程式碼。

### 開工裁決二：Wave 0 逐步清單獨立成文件
[phase7a-wave0-owner-runbook.md](phase7a-wave0-owner-runbook.md)
新增，把 §9 Wave 0 的九個工單展開成含依賴順序跟每步驗證方式的逐步
操作清單，供老闆平行執行，比照既有驗收指南（如
`phase6-stage6a1-acceptance-guide.md`）的獨立成檔慣例。

### Wave 1 完成：259 個測試案例（+9），tsc/lint/build 全過
落地範圍：
- **C1-1**：新 migration `20260722000011_phase_7a_operational_flags.sql`
  寫入 `system_settings.deposit_flow_enabled=false`、`push_enabled=true`，
  已對 `warmjar-dev` 執行並核對寫入正確。
- **C1-2**：`src/lib/member/counterBindGrant.ts`（`createCounterBindGrant`／
  `verifyCounterBindGrant`），沿用 `signedToken.ts` 既有簽章機制，TTL
  10 分鐘，7 個測試案例（含 TTL 邊界、tamper、kind 互斥）。
- **C1-3**：`src/lib/booking/customersForMember.ts` 新增共用尾段
  `bindLineUserIdToCustomer`（單次失效設計：對 `profiles.line_user_id`／
  `customers.profile_id` 做條件式 `UPDATE ... WHERE ... IS NULL`，第一個
  成功呼叫的人才綁得到，沒搶到的由純函式 `decideExistingBindOutcome`
  判斷是冪等成功還是衝突），`findOrCreateCustomerForMember` 改為呼叫
  這支共用尾段，不再各自重複邏輯。**附帶修正一個潛在既有問題**：原本
  `findOrCreateCustomerForMember` 對「profile 已存在但 line_user_id
  是別的值」這個理論上不該發生的邊界情況，會靜默覆蓋既有綁定；重構後
  改為偵測到衝突就往外拋錯，不再靜默覆蓋，是這次共用尾段化的正面副
  作用，不是本輪主動要修的 bug，只是重構過程中一併變得更安全。2 個
  測試案例（`decideExistingBindOutcome`）。
- **已知測試覆蓋缺口（延續既有慣例，非疏漏）**：`bindLineUserIdToCustomer`
  跟 `findOrCreateCustomerForMember` 本身（有 Supabase IO）沒有直接
  vitest 覆蓋——核對過整個專案沒有任何地方 mock 過 supabase 的 fluent
  builder chain，既有慣例是「純函式拆出來測、IO 函式靠依賴注入整支替換
  測」（見 `notificationSender.ts`／`decideSendAction` 的先例），這裡
  依循同一慣例，只抽出並測試了決策邏輯本身。原子更新是否真的race-safe，
  留給 Wave 2 接上 route 後、Wave 3 驗收前補一個手動/整合層級的驗證
  （兩次呼叫同一個 customerId 不同 lineUserId，確認第二次回傳衝突）。

### Wave 1 驗收通過，開工裁決三項，直接進 Wave 2

**裁決一：管理端 LINE 解綁功能掛帳**——觸發場景是客人更換 LINE 帳號，
舊 userId 卡位導致新綁定拋衝突，排入 P-5（`phase-7a-early-launch-draft.md`
§9），7-B 或首例真的發生時才實作。過渡期手工解法（owner 用 Supabase
SQL Editor 手動清除該客人 `profiles.line_user_id` 為 NULL）已寫進設計
文件 §9，供櫃檯應急，Wave 2 完成即可用，不用等 P-5。

**裁決二：race-safe 手動驗證排入 Wave 3 驗收劇本**——測項定義（同一
customerId 連打兩次 `counter-bind-complete` 帶不同 lineUserId，第二次
應回 409）已記在 §9 F-3b，正式驗收劇本文件會在 Wave 3 開工前產出。

**裁決三：Wave 2 立即動工。**

### Wave 2 完成：259 個測試案例（不變，無新增可測邏輯），tsc/lint/build 全過

落地範圍：
- **C2-1**：`/book/create-appointment/route.ts` 讀
  `system_settings.deposit_flow_enabled`，關閉時用既有
  `evaluateDepositPolicy` 的 `manualWaiver` 參數達成全域略過（純函式
  本身零改動）。**範圍修正**：實作時核對 `createManualAppointment`
  （後台代客建單）程式碼，發現它從一開始就一律直接 `confirmed`、
  從不呼叫 `evaluateDepositPolicy`（既有註解明載），原工單描述「兩處
  都要接」不準確，只需要接 `/book/create-appointment` 這一處。
- **C2-2**：`sendNotification` 開頭新增 `push_enabled` 檢查，`false`
  時直接寫 `skipped`（`push_disabled_by_admin`）並短路，不查範本/客人
  資料。owner 限定切換 UI 放在既有 `/admin/message-templates` 頁面
  最上方（跟通知相關設定同一頁，新增 `PushKillSwitch` 元件），沒有
  另開新頁面。
- **C2-3**：新增 `/api/member/counter-bind-complete` route（驗證
  grantToken + idToken，呼叫 Wave 1 的 `bindLineUserIdToCustomer`）；
  `MemberApp.tsx` 新增 `bindGrant` query 參數分支，完全獨立於既有
  liff-bind／OTP 流程，不改動那段已通過 Stage 6A-1 真機驗收的程式碼；
  `/admin` 會員詳情頁新增「產生 LINE 綁定連結」按鈕（跟既有「發送
  LINE 訊息」對稱位置，未綁定客人才顯示）+ `CounterBindDialog`（本機
  用 `qrcode` 套件產生 QR，grantToken 不經過任何第三方服務）；新增
  Server Action `generateCounterBindGrant`（manager/owner 皆可）；
  `writeAuditLog` 記錄產生綁定連結這個動作。

**實作中修正一個型別陷阱（記錄避免下次重踩）**：`createAdminClient()`
本身沒有帶 `<Database>` 泛型，直接在 `_actions.ts` 這類呼叫端 inline
帶 embedded relation 的 `.select("profiles ( line_user_id )")` 查詢，
TS 會把 `profiles` 誤推論成陣列而不是單一物件（`{line_user_id}[]`
而非 `{line_user_id}`），導致 `.line_user_id` 存取編譯失敗。修法：
這類查詢一律包進一個宣告 `supabase: SupabaseClient<Database>` 參數
型別的 helper 函式裡（這裡新增 `customerHasLineBinding`，放
`customersForMember.ts`），呼叫端只傳 `customerId` 進去，不直接 inline
查詢——這正是 `memberDetail.ts`／`messageTemplatesData.ts` 等既有檔案
一直以來的寫法，只是這次是本專案第一次在 `_actions.ts` 檔案裡直接對
`createAdminClient()` inline embedded-relation 查詢才第一次暴露這個
陷阱，往後任何要在 Server Action 檔案裡查 embedded relation 的地方
都要比照辦理，不要直接 inline。

**已知測試覆蓋缺口（延續 Wave 1 已記錄的既有慣例，非新增）**：
`generateCounterBindGrant`、`counter-bind-complete` route、
`updatePushEnabledAction`、`fetchPushEnabled`/`updatePushEnabled` 皆無
直接 vitest 覆蓋（Supabase IO，比照既有 Server Action／route 檔案一律
不寫測試的慣例）。`buildCounterBindUrl`（純字串組裝，`liffLinks.ts`）
也沒有測試，但整支 `liffLinks.ts` 既有的三個函式本來就都沒有測試檔，
維持一致不特別開先例。

### 下一步
Wave 2 完成，等老闆回報 Wave 0 進度。Wave 3 開工前，依裁決二產出正式
驗收劇本（比照 6A-1 格式的獨立文件），含 F-3b race-safe 測項。

### Wave 2 驗收通過，Wave 3 正式驗收劇本已產出

老闆追加兩項排入劇本：`push_enabled=false` 時 `notifications_log` 是否
留下紀錄（含原因）、`deposit_flow_enabled=false` 時有爽約紀錄的測試
會員走 `/book` 應直接 `confirmed`（確認開關語意正確）。

**驗收前先讀程式碼核對，不是憑印象寫測項**（比照 2026-07-19 條目訂下
的紀律）：重讀 `notificationSender.ts` 目前的 `sendNotification`／
`finish()` 實作，確認 `push_enabled=false` 時走
`finish(supabase, input, { status: "skipped", reason:
"push_disabled_by_admin" })`，而 `finish()` 對任何結果都無條件寫一筆
`notifications_log`（`skipped` 的 `error_message` 就是 `reason`）——
**「關閉推播時是否留下紀錄」這件事現況已確認會留下紀錄，不是無聲跳過**，
老闆原本掛的「若無聲跳過，屆時議是否補記錄」這個但書不成立，驗收劇本
裡改寫成「拿真機結果核對這個判讀」，不是懸而未決的問題。

`deposit_flow_enabled` 測項額外加測「打開開關後同一位客人真的會被要求
訂金」——只測關閉時不收訂金不足以證明開關真的有作用（沒有排除巧合的
可能性，`no_history` 本來就會導致 `requiresDeposit=false`，而測試會員
特意製造了爽約紀錄就是為了排除這個巧合，但還需要反向驗證「打開時真的
會變」才算完整證明開關語意正確），兩態都測完才算數。

`docs/phase7a-wave3-acceptance-guide.md` 已落檔，比照
`phase6-stage6a1-acceptance-guide.md` 格式，六個章節（零～五）+ 收尾，
涵蓋 F-1 至 F-5（含新增的 F-3b／F-3c／F-3d）。`phase-7a-early-launch-draft.md`
§9 Wave 3 表格同步更新，加入「對應驗收劇本章節」欄位，不重複列出詳細
步驟。

### 下一步
等老闆執行 Wave 3 驗收劇本，回報結果（含任何 ✗ 項目）。全數通過後
Phase 7-A 正式上線。
