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
