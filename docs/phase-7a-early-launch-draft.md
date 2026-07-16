# Phase 7-A 提前版：真實客人上線（雙軌並行）— 設計草案 v2（已定案）

> 狀態：**已定案 2026-07-22** — 設計階段完成，§8 全部項目已回填、gate
> 全數通過。`.github/workflows/notifications-cron.yml` 已依裁決落地
> （含正式網址 `book.warmjar.com.tw`，等實際部署完成前呼叫會先失敗，
> 屬預期中的暫時狀態）。**其餘所有 Console／Vercel／Supabase 操作尚未
> 動手**——本檔案是設計與決策的定案，不是「已上線」的宣告，§9 的實作
> 工單拆解列出接下來要做的事，**需你明確下令才開工**，不會自動接著動。
> 金鑰一律走環境變數，本檔案不會出現任何實際金鑰值。已於
> [design-log.md](design-log.md) 補一筆摘要。
>
> **v2 變更摘要（相對 v1，逐項裁決結果）**：
>
> | # | 章節 | 裁決 |
> |---|---|---|
> | 1 | §4.3 | 選定「櫃檯代客綁定」為 7-A 主路徑，OTP 在此路徑**完全跳過**（不是繞過既有 OTP 程式碼，是另開一條不經過它的路徑），流程細節見下方全新展開 |
> | 1b | §4.1 | 三竹簡訊在帳本重新定位為 **7-B 第一優先**，用途明確為「解鎖遠端自助綁定」（櫃檯代客綁定只解決臨櫃情境） |
> | 2 | §4.2 | ECPay 採「加明確開關」定案——新增 `deposit_flow_enabled`，**不**依賴 `no_history` 巧合，7-A 上線時關閉，正式金鑰到位時才開啟，掛帳登錄 |
> | 3 | §5.4 | `push_enabled` 緊急關閉開關**已採納**，納入實作範圍（原本是待同意的建議） |
> | 4 | §7.2 | 額度數字為**上線前置條件**，查證中，未定案前不部署 |
> | 5 | 其餘 | 照 v1 草案通過，無變動 |
> | 6 | §4.3 | **v2 審查通過後追加**：bindGrant token 補「綁定成功即失效」設計，判斷結果見下方——選了比你建議的「audit_logs 查重」更輕量、且不受競態影響的做法（重用 `profiles.line_user_id`／`customers.profile_id` 從 NULL 變非 NULL 這個天然的一次性狀態轉換，不必新增表/欄位/索引），只有一個極窄的殘餘風險降級為「已知風險，文件註明」，理由見 §4.3 說明 |
> | 7 | §2.3 | **v2 審查通過後追加**：新增「零成本起步變體」（Vercel Hobby + 每日固定 1 次 20:05），列為 7-A 第一階段預設，Pro 升級改列可選後續工單、附觸發條件。容錯差異已記錄；額外發現 `revisit_care` 在此變體下是**結構性完全不觸發**（不是容錯變差），需要你在 §8 三選一 |
> | 8 | §2.3 | **裁決 Option C**：GitHub Actions 補位 `revisit_care`（12:35 UTC+8）與 `reminder_day_before`（20:05 UTC+8，與 Vercel 原生 cron 形成雙保險），已落地 `.github/workflows/notifications-cron.yml`（放 `feature/booking-system` 分支，`CRON_SECRET` 走 repository secret 無明文，端點網址待子網域定案回填），失敗告警沿用 GitHub Actions 原生 email，§8 收斂為 3 項 |
> | 9 | §1.1／§1.4／§2.1／§7.2 | **最終定稿**：Supabase 改為新開獨立 organization「Warmjar-Booking」+ Free 方案起步（推翻原「沿用既有 organization」建議），Pro 升級硬觸發點＝6B 前置作業啟動前；子網域定案 `book.warmjar.com.tw`（已回填進文件與 workflow）；§7.2 額度 gate 通過（夯客 3,189＋7-A 新增 600＝3,789／6,000＝63%，監控線 5,000）。§8 收斂為總覽表，§9 新增實作工單拆解 |

## 0. 決策脈絡（2026-07-22 決策：乙案）

Stage 6A-1（推播骨架）已於 2026-07-21 真機驗收全數通過並正式關閉（見
[phase6-stage-split-design.md](phase6-stage-split-design.md)、
[phase6-stage6a1-acceptance-guide.md](phase6-stage6a1-acceptance-guide.md)），
但至今只在 `warmjar-dev` + 老闆個人測試帳號上跑過，尚未服務過任何真實客人。

本輪決策：**乙案——Phase 7 部分提前**，把「正式上線」所需的最小基礎設施提前
到 6A-1 之後立刻做，讓已經驗收通過的推播骨架能實際服務真實客人，不用等到
完整 Phase 7（届时范围更大，例如全面電子發票、更完整的正式環境打磨）才上線。

**營運形態（雙軌並行，本輪的核心前提）**：

- 客人預約管道**照舊**——繼續經夯客 HOTCAKE 或電話預約，**不**引導客人改用
  `/book` 自助預約（這點很關鍵，直接影響下面 §4.3 的 OTP 缺口分析）。
- 櫃檯在自家後台（`/admin`）**同步建單**（`createManualAppointment`，臨櫃/電話
  代客建立，不走訂金流程），觸發既有的 `booking_confirmed` 推播（見
  [design-log.md 2026-07-18 條目](design-log.md)補洞紀錄）。
- 客人透過自建 LIFF（`/member`）自願綁定會員身分，之後開始收到預約確認、
  前一日提醒、隔日回訪關懷等推播。「儲值」分頁維持既有唯讀顯示，但見下方
  §0.1——本輪期間不會有任何真實購買發生，所以這個分頁對每位客人都會是
  零餘額，不是功能缺陷，是這輪刻意的範圍限制。
- 夯客既有的自動回覆、Rich Menu、夯客自己的預約通知**完全不受影響**——
  這是延續 Stage 6A 一貫的「夯客零影響」鐵律，不是這輪新增的承諾。

**範圍邊界**：本輪只做「讓 6A-1 能上正式環境、服務真實客人」所需的基礎設施
（正式資料庫、正式部署、環境變數、驗收標準），**不**包含三竹簡訊、SMTP、
群發引擎（見 §4），也**不**包含 Stage 6B（全面接管夯客）的任何範圍。
6A-2（電子同意書）維持已排入的既有排程，但本輪主線資源優先給 7-A（見 §6）。

### 0.1 雙軌期營運範圍限制（開工裁決，2026-07-22）

**新系統（`warmjar-booking-prod`）這輪只啟用三件事：代客建單、推播、
LIFF 綁定。儲值購買與 POS 真實結帳暫不啟用**，掛帳登錄，啟用前置條件是
「每日備份方案落定」（見 §1.4 的 Free 方案風險論證——儲值/結帳資料正是
「夯客側沒有備援」的那一塊，在還沒有像樣的每日備份之前不該讓真實金錢
資料開始在這個資料庫裡累積）。

**如何落實這個限制**：已核對過（`grep` 過 `src/`），`/admin` 的結帳
（POS，Phase 4）與儲值購買（Phase 5）功能**目前沒有任何系統層級的
啟用/停用開關**，兩者都是只受角色權限（owner/manager）保護的既有功能，
不是被某個 flag 擋住。依你的指示：**沒有既有開關可串接，本輪不新增一個
只為了擋這兩個功能**——那會是為了一個過渡期限制去新增永久留在程式碼裡
的開關，不划算。改採**營運紀律**：真實客人在 `warmjar-booking-prod`
上線期間，店員操作時**不使用** `/admin` 的結帳（POS）與儲值購買畫面，
這兩個入口的程式碼、資料庫欄位都原封不動保留（不是移除功能，只是這輪
不用），等每日備份方案（§1.4 Pro 升級）到位後才恢復正常使用。

**這項限制不需要新增任何程式碼**，純粹是店務操作範圍的約束，記錄在這裡
跟 `design-log.md` 供將來查核依據；`/admin` 系統本身在這輪不會為此新增
任何 UI 警示或程式碼層級的擋點。

---

## 1. 正式資料庫方案

### 1.1 評估結論：新建獨立 Supabase 正式專案（v2 最終版：新開獨立 organization）

目前存在的兩個 Supabase 專案都不適合直接當「預約系統正式庫」：

| 候選 | 可否採用 | 理由 |
|---|---|---|
| `oqudfafwtnwzqbjdflte`（既有正式庫） | ❌ **絕對排除**（你已明講不入選項） | 這支目前跑的是官網其他既有功能，貿然混用範圍不明，且本來就是禁區 |
| `warmjar-dev`（既有開發庫） | ❌ 不建議 | 目前裝滿 Phase 1～6 的測試資料、驗收用假會員、demo 師傅/服務（`supabase/seed.sql` 那兩位示範師傅、示範服務都是佔位資料，不是真實價目表），拿來裝真實客人的預約/儲值/個資，等於「測試環境」與「正式資料」永久混在一起，之後任何一次本機驗收操作都有污染真實客人資料的風險——這正是環境隔離要解決的問題，不能省 |
| **新建獨立正式專案（建議）** | ✅ **建議採用** | 全新、乾淨、只裝真實資料，跟 `warmjar-dev` 完全隔離，是目前 Supabase 能達到的最強隔離手段（Supabase 沒有「同專案內 dev/prod schema 切換」這種輕量機制，付費的 Branching 功能是給 preview 分支用的，不是給長期並存的兩個環境用的，专案层級分离才是对的粒度） |

**v2 最終裁決**：新開一個獨立 Supabase **organization**「Warmjar-Booking」，
底下再建立專案 `warmjar-booking-prod`——**這點推翻本節原本的建議**（原草案
建議沿用既有 organization 底下開新專案即可，你這輪改為連 organization 層級
都獨立），隔離粒度更強（organization 層級通常對應獨立的計費/成員權限邊界，
不只是專案層級）。**Fallback**：若平台端建立新 organization 的流程被拒絕
（例如帳號限制、審核卡關），退回「既有 organization 底下升級 Pro 開新
專案」這個原本的備案，**屆時再議**，本輪不預先展開這個分支的細節設計。

### 1.2 Schema 遷移方式

`supabase/migrations/` 目前累積 10 個檔案（Phase 1 到 Phase 6），依檔名時間
戳記順序執行過就是完整 schema：

```
20260707000001_init_schema.sql
20260707000002_triggers_and_indexes.sql
20260707000003_appointments_exclusion_and_pending_deposit.sql
20260708000004_deposit_records_ecpay_support.sql
20260709000005_admin_checkin_and_deposit_waiver.sql
20260710000006_customer_search_and_source_options.sql
20260711000007_phase_3_3_members.sql
20260712000008_phase_4_checkout_commission.sql
20260713000009_phase_5_stored_value.sql
20260714000010_phase_6_line_integration.sql
```

專案目前沒有接 Supabase CLI 的 `supabase db push` 流程（沒有
`supabase/config.toml`，過去都是手動貼 SQL Editor 或用 `DATABASE_URL` 直接
執行），這輪比照既有習慣，**不**額外引入新的遷移工具鏈，用最小步驟做：

1. 新建的 `warmjar-booking-prod` 專案拿到自己的 `DATABASE_URL`（Supabase 後台
   → Project Settings → Database → Connection string）。
2. 依檔名順序，逐一對正式庫執行這 10 個 migration 檔（`psql
   "$DATABASE_URL_PROD" -f supabase/migrations/20260707000001_init_schema.sql`，
   依序往下，或用 SQL Editor 逐檔貼上——兩種方式擇一，重點是**順序不能亂**，
   因為後面的 migration 依賴前面建好的表）。
3. **不要**執行 `supabase/seed.sql`——這份是本機開發用的示範資料（2 位假
   師傅「陳師傅」「林師傅」、2 項佔位服務，檔案開頭註解本身就寫明「本機測試用
   示範資料」）。正式庫的真實師傅名單、真實服務價目表，需要你上線前用
   `/admin` 後台介面手動輸入（跟本來上線就該做的事一樣，只是提醒這裡刻意
   不用腳本代勞，避免把測試假名混進正式資料）。
4. `message_templates`（隔日回訪等範本的老闆定稿文案）跟三階儲值方案的種子
   資料，都已經寫在 migration 檔本身裡面（`20260714000010` 跟
   `20260713000009`），**不是**額外的 seed 檔，跟著 migration 一起執行就會
   自動帶入正式庫，這兩者是真實資料，不用另外處理。
5. 執行完畢後，跑一次快速核對：`\dt public.*` 或後台 Table Editor 目視確認
   10 個 migration 涵蓋的表都存在，`message_templates` 有 5 筆、
   `stored_value_plans` 有 3 筆（暖心/沐光/御藏）。
6. **v2 新增**：本輪另外需要第 11 個 migration 檔（例如
   `20260722000011_phase_7a_operational_flags.sql`），內容是對
   `system_settings` 寫入兩把新的 key（比照既有 `notification_schedule`
   的 `INSERT` 寫法）：`deposit_flow_enabled`（值 `false`，見 §4.2）、
   `push_enabled`（值 `true`，見 §5.4）。這支 migration **兩個環境都要
   跑**——先在 `warmjar-dev` 驗證過再對 `warmjar-booking-prod` 執行，
   跟其餘 10 個既有 migration 一樣走 §1.2 開頭列的既有執行方式（不是
   只有正式庫需要，dev 端也要能測試這兩個開關的行為）。

### 1.3 與 dev 庫的環境隔離

隔離粒度是**專案層級**（最強隔離），不是同專案切 schema：

| 環境 | Supabase 專案 | 使用時機 |
|---|---|---|
| 本機開發 / 未來驗收新功能 | `warmjar-dev` | 本機 `next dev`，所有後續 phase 的開發與驗收流程維持現狀不變 |
| 正式環境（`/book` 真實客人、`/admin` 正式操作、正式推播） | `warmjar-booking-prod`（新建） | 新的正式 Vercel 部署專用 |

Vercel 專案的環境變數分兩組（見 §3），本機 `.env.local` 永遠指向
`warmjar-dev`，新 Vercel 專案的 Production 環境變數指向
`warmjar-booking-prod`——兩套 Supabase 金鑰**physically 不會出現在同一份設定
檔裡**，不是靠人記得「這次要小心點掉」，是結構上分開，這是專案層級隔離
相對「同專案 schema 切換」的關鍵優勢。

**v2 定案**：新 Vercel 專案若之後也有 Preview（分支預覽）部署，Preview
環境的 Supabase 連線**沿用 `warmjar-dev`**，不新開第三個 Supabase
專案（沒必要的複雜度），也不指向 `warmjar-booking-prod`（避免 preview
部署的測試操作污染正式資料）。

### 1.4 備份策略最小版（v2 最終裁決：Free 方案起步，人工匯出為主要防線）

**v2 裁決**：`warmjar-booking-prod`（新 organization「Warmjar-Booking」底下）
第一階段採 **Free 方案**，不在上線時升級 Pro。

1. **Supabase 平台自動備份**：Supabase **Pro 方案**（$25/月起）含每日自動
   備份（保留 7 天）；**Free 方案完全沒有自動備份機制**，這是選 Free 的
   已知代價，不是遺漏。
2. **人工週期性匯出（第一階段的主要防線，不是補充手段）**——因為 Free
   沒有平台自動備份，這一步從「錦上添花的第二保險」升格為「唯一的備份
   手段」：每週手動 `pg_dump "$DATABASE_URL_PROD" > backup_YYYYMMDD.sql`，
   存到你自己控制的地方（例如自己的 Google Drive）。**這步驟你自己執行
   即可，不需要程式介入**。
3. **為什麼 Free 方案配人工週匯出在第一階段可接受（「風險有界」的精確
   範圍）**：雙軌期客人預約仍照舊經夯客/電話，**預約紀錄**這塊即使
   `warmjar-booking-prod` 真的掉資料，夯客那邊仍留有對應紀錄可回頭
   重建，風險確實有界。**但這個論證不適用於本系統獨有、夯客完全沒有
   對應資料的部分**——儲值本金/贈額（Phase 5 既有功能，`/admin` 現金/
   刷卡購買儲值，7-A 期間若真的對真實客人開放使用）、抽成紀錄、
   `audit_logs`。若 7-A 期間有真實客人在系統裡購買儲值，這部分資料的
   風險視窗就是「距離上次人工匯出過了多久」（最壞情況下到一週）。
   **這是你知情後的決定，不是我判斷後幫你降低風險等級**——若你評估
   7-A 期間會有真實儲值購買，建議人工匯出頻率至少要跟得上「你能接受
   多久帳務對不上」的容忍度（例如改成「每次有較大筆儲值購買後手動匯出
   一次」而不是死板每週一次）；若 7-A 期間刻意先不開放真實儲值購買
   （留到 Pro 升級後才開），這個顧慮就不成立，我不代你判斷是哪一種。
4. **明確不做**：本輪不建立自動化備份腳本/排程——Free 方案下沒有平台
   機制可以疊加，自建排程備份等於把整個備份責任都攬到自己身上維護，
   性價比更差，比較合理的路徑是需要更高保障時直接升級 Pro（見下方觸發
   條件），不是自己造一套排程備份工具。

**Pro 升級觸發條件（v2 新增）**：**「Stage 6B 前置作業啟動、資料轉正之前」
必須完成升級**——6B 是全面接管夯客、`warmjar-booking-prod` 的資料從此變成
唯一權威來源，屆時 §1.4.3 說的「風險有界」論證（夯客側還有備援）完全不再
成立，Free 方案的備份缺口在那個時間點就不能再忍受。這是明確的硬性時間點，
不是「之後再看」——在 6B 前置作業啟動前，這件事要處理完。若你判斷 7-A 期間
儲值資料量提高到讓你不安（見上方第 3 點），也可以提前升級，不用等到 6B。

---

## 2. 部署形態

### 2.1 獨立 Vercel 部署 + 子網域

**硬約束重申**：main 分支與正式官網現有的 Vercel 專案**完全不動**。做法是
**同一個 GitHub repo，新增第二個 Vercel Project**（Vercel 原生支援一個 repo
掛多個 Project，各自獨立設定 Production Branch、環境變數、網域，彼此互不
影響）：

| | 既有官網 Vercel Project | 新建 Vercel Project（本輪） |
|---|---|---|
| Production Branch | `main`（不動） | 新建專屬分支，例如 `release/booking-prod` |
| 網域 | 現有正式網域（不動） | **`book.warmjar.com.tw`（v2 定案）** |
| 環境變數 | 現有設定（不動） | 全新一組，指向 `warmjar-booking-prod`（見 §3） |
| Vercel Cron | 無 | 零成本起步變體：每日 1 次固定排程 + GitHub Actions 雙保險補位（見 §2.3），Pro 升級後才改回 `*/15`／`*/10` |

**分支策略**：不建議直接把新 Project 的 Production Branch 指向目前的
`feature/booking-system`（這支分支還在持續開發，每次 push 都會觸發正式部署，
風險偏高）。建議：確認這輪要上線的範圍後，從 `feature/booking-system`
切一支長期存在的 `release/booking-prod` 分支專門對應正式部署，往後每次要
推正式環境更新，走「合併進 `release/booking-prod`」這個明確動作，不是任何
分支的每個 commit 都自動上正式——這是刻意的部署節奏控制，跟 `main` 現在的
用法邏輯一致（`main` 也不是每個 feature 分支自動合併上去）。

**兩個 Vercel Project 共用同一個 repo 的注意事項**：都是同一份程式碼
（含官網 `/`、`/book`、`/member`、`/admin`、`/staff` 全部路由），新 Project
的子網域理論上也能開到官網首頁 `/`——這不會是問題（同一份程式碼本來就該
處處一致），只是**新子網域實際只會被拿來用 `/book`、`/member`、`/admin`、
`/staff` 這幾條路徑**，首頁走現有官網網域，不會讓客人混淆去哪個網址找官網
內容。

### 2.2 LIFF Endpoint 更換為正式網址

Stage 6A-1 目前的自建 LIFF app（掛在自建 LINE Login channel
`warmjar-booking` 底下）Endpoint URL 填的是本機開發用的 cloudflared 臨時
通道網址（每次重開會換）。正式上線前，需要到 **LINE Developers Console →
`warmjar-booking` Login channel → LIFF 分頁**，把這個 LIFF app 的 Endpoint
URL 改成 **`https://book.warmjar.com.tw/`**（v2 定案的正式子網域）。

**操作順序建議**：這個 Endpoint URL 一改，客人當下開 LIFF 就會被導去
`book.warmjar.com.tw`——建議等該網域的 DNS／Vercel 部署都確認能正常
連通後再切過去，避免中間出現「Endpoint 已改但目的地還沒真的活著」的
空窗期（這段期間客人綁定會直接連不到任何東西）。這是操作順序建議，不是
硬性依賴關係，§9 工單拆解會標出這個先後順序。

這是編輯**我方自建資源**（Login channel `warmjar-booking` 是 Stage 6A-1
自己建的，不是夯客的東西），不在既有禁區清單內，但仍列入 §7 逐項核對，
確保操作範圍精準（只改這一個 LIFF app 的 Endpoint URL 欄位，不動其他任何
設定，尤其不要手滑碰到旁邊夯客既有的 LINE Login channel「溫罐子」）。

改完之後，`NEXT_PUBLIC_LIFF_ID` 環境變數值不變（LIFF ID 本身沒換，只是
Endpoint URL 換了），新 Vercel Project 的正式環境變數照抄本機 `.env.local`
現有的 `LINE_LOGIN_CHANNEL_ID`／`NEXT_PUBLIC_LIFF_ID` 即可。

### 2.3 Vercel Cron 設定：零成本起步變體（第一階段預設）與 Pro 升級（可選）

**v2 追加裁決**：7-A 第一階段**預設採零成本起步變體**（Vercel Hobby 方案，
不強制升級 Pro），Pro 相關設定改列為**可選的後續升級步驟**，觸發條件見
下方。這一節取代原本「直接假設要升級 Pro」的寫法。

先重要提醒一件事：`vercel.json` 是**同一個 repo 的檔案，兩個 Vercel
Project 各自吃自己 Production Branch 上的版本**——`main`（既有官網）
分支目前**完全沒有這個檔案**（已核對：`git show main:vercel.json`
回報檔案不存在，這個檔案是這輪 `feature/booking-system` 分支才新增的）。
這代表新專案 `release/booking-prod` 分支上的 cron 設定，不管怎麼改，
**都不會影響到既有官網那個 Vercel Project**，兩者結構上天生隔離，不是
靠人小心維持的約定。

#### 變體 A（零成本起步，第一階段預設）：Vercel Hobby + 每日固定 1 次

Vercel **Hobby** 方案的限制是「每支 cron job 每天最多觸發一次」（逐支
job 各自算，不是整個專案共用一次額度）。`release/booking-prod` 分支的
`vercel.json` 改成：

```json
{
  "crons": [
    { "path": "/api/cron/notifications", "schedule": "5 12 * * *" },
    { "path": "/api/cron/deposit-sweep", "schedule": "10 12 * * *" }
  ]
}
```

（cron 排程是 UTC，`5 12 * * *` = 台灣時間每天 20:05，剛好落在
`reminder_day_before` 預設排定的 20:00 之後、`isWithinScheduleWindow`
既有容許誤差之內；`deposit-sweep` 排 20:10，純粹錯開避免兩支同秒觸發，
無特別意義。）

**容錯差異（你要求明確記錄的部分）**：

| | 現行 `*/15`（Pro） | 零成本變體（Hobby，每日 1 次） |
|---|---|---|
| `reminder_day_before` 單次執行失敗 | 15 分鐘後下一次 tick 大機率仍落在容許誤差窗內，自動補上，客人感覺不到 | **當天沒有下一次機會**——這次 20:05 執行若因為暫時性錯誤（網路、LINE API、資料庫）失敗，當天所有該收到「前一日提醒」的客人**全部收不到**，要等明天這個時間才會再跑一次（但明天這次是處理「明天的預約」，今天漏掉的這批不會被補發，`idx_notifications_log_dedupe` 的設計本來就是「發過就不重發」，不是「沒發過的話下次自動找補」） |
| 失敗當下有沒有告警 | 目前沒有主動告警機制（現況，不分變體） | 同左，沒有變得更差也沒有變得更好——**這代表零成本變體下，一次靜默失敗就等於一整天的提醒完全消失且沒人知道**，值得你知道這個風險型態，不是叫你一定要做告警（本輪不排入告警機制開發，只是誠實標出風險） |

> **後續更新（見下方 Option C 裁決）**：上表「`reminder_day_before` 單次
> 執行失敗」那格描述的是**只有 Vercel 原生 cron 這一路**時的風險。
> Option C 落地後，20:05 這個時段變成 Vercel 原生 cron + GitHub Actions
> 雙路觸發，任一路失敗、另一路還是有機會補上，單一失敗點的風險已大幅
> 降低（但不是完全等同 Pro 的 `*/15`——例如「整個環境本身在 20:05 那
> 一刻剛好掛掉」這種兩路都會一起失敗的情境仍然存在，只是機率低很多）。
> 失敗告警那格維持不變，`curl --fail` 讓 GitHub Actions 那一路失敗時
> 至少有平台原生 email 通知，Vercel 原生 cron 那一路目前仍然沒有任何
> 告警。

#### `revisit_care` 的結構性衝突（不是容錯問題，是「完全不會觸發」，需要你選一個）

`reminder_day_before`（20:00）跟 `revisit_care`（`system_settings` 預設
12:30）是**兩個不同時段**的排程，現行 `*/15` 頻率下，一天 96 次執行
自然涵蓋兩個時段各自的窗口；但零成本變體**一天只有一次執行機會**，
若固定排在 20:05，`isWithinScheduleWindow` 檢查「現在是否落在 12:30
±容許誤差」在 20:05 這個時間點必然是否——**`revisit_care` 會每天穩定
地完全不觸發，不是偶爾漏發，是結構上永遠不會發**。這點跟上面
`reminder_day_before` 的「容錯變差但仍會發」性質不同，必須分開講清楚，
不能混在一起說成同一種風險。

三個選項（本輪先列出，需要你選）：

| 選項 | 做法 | 取捨 |
|---|---|---|
| A | 把 `system_settings.notification_schedule` 的 `revisit_care` 改成跟 `reminder_day_before` 同一個時段（例如也設 20:00 附近），兩者同一次執行一起處理 | 零成本、零新增設定，但「隔日回訪關懷」從中午改成晚上發送，**這是碰到 CLAUDE.md 業務規則 3 背後的老闆營運洞察範疇**（「隔日回訪＋前一日提醒」的時段安排本來就是刻意設計，不是隨便選的），不能我這邊自己決定，需要你明確同意這個時段改動 |
| B | 零成本期間 `revisit_care` 直接暫停（`system_settings` 可以維持原值不動，反正不會被觸發），等 Pro 升級後才恢復原定 12:30 | 零成本、零新增設定，但雙軌期客人收不到隔日回訪關懷訊息，這則訊息本身業務目的（呼應 CLAUDE.md 業務規則 3 的營運洞察、降低 no-show）在零成本期間完全失效 |
| C | 不動 Vercel 設定，改用**免費外部排程**（例如這個 repo 本來就有的 GitHub Actions，設定一支 `.github/workflows/notifications-cron.yml`，用 `schedule` 觸發，`curl` 打 `/api/cron/notifications` 帶 `CRON_SECRET`，可以設兩個時間點分別對應 12:30 跟 20:00）繞過 Vercel Hobby 的「每天一次」限制，兩個時段都保留 | 真正的零成本、兩個時段都保留原定行為，但多一份外部設定要維護（GitHub Actions secret、workflow 檔案），且 GitHub Actions 排程觸發本身是「盡力而為」，官方文件明講高負載時段可能延遲，可靠度跟 Vercel 原生 Cron 不完全同一個等級（但對「一天發一兩次」這種頻率而言，這個差異影響很小） |

**v2 追加裁決：選 Option C。** 已落地為 `.github/workflows/notifications-cron.yml`
（放在 `feature/booking-system` 分支，隨這輪其餘程式碼一起走），細節：

- **兩個排程時段**：`35 4 * * *`（UTC）= 台灣時間 12:35，涵蓋
  `revisit_care` 窗口；`5 12 * * *`（UTC）= 台灣時間 20:05，涵蓋
  `reminder_day_before` 窗口，**刻意跟 Vercel 原生 cron 排在同一分鐘**，
  對 `reminder_day_before` 形成雙保險——當天只要 Vercel 原生觸發或
  GitHub Actions 觸發**其中一邊**成功，當天的前一日提醒就發得出去，
  不再是單一失敗點。兩個時段都打同一支 `/api/cron/notifications`
  （路由內部本來就依 `system_settings.notification_schedule` 判斷當下
  該處理哪個範本，不需要為兩個時段分別寫路由）。
- **多打無害，已寫進 workflow 註解**：`notifications_log` 對
  `(related_appointment_id, template_key)` 的 partial unique index
  （`status='sent'` 才算）保證重複觸發不會重複發送，Stage 6A-1 驗收
  （`phase6-stage6a1-acceptance-guide.md` 3-5）已經真機驗證過這個
  dedupe 行為，這裡是直接沿用既有已驗證機制，不是新假設。
- **`CRON_SECRET` 注入方式**：GitHub repository secret，workflow yaml
  裡只有 `${{ secrets.CRON_SECRET }}`，**沒有任何明文**。**設定步驟
  （你親手操作，我不經手這個值）**：GitHub repo → Settings → Secrets
  and variables → Actions → New repository secret → Name 填
  `CRON_SECRET`、Value 貼上跟 §3.2 新 Vercel Project 的 **Production
  環境變數 `CRON_SECRET` 完全相同**的值（兩邊必須逐字元一致，這支
  workflow 打的是同一個 `/api/cron/*` 認證機制，Vercel 那邊跟
  GitHub Actions 這邊各自獨立存一份，不是共用同一個環境變數來源）。
- **正式端點網址**：§2.1 已定案 `book.warmjar.com.tw`，workflow 檔案已
  同步回填為 `https://book.warmjar.com.tw/api/cron/notifications`（不再
  是佔位符）。在該網域的 DNS／Vercel 部署真正上線之前，這支 workflow
  仍會照時間準時觸發，但呼叫本身會失敗（網址還打不通）——這是部署時序
  上預期中的暫時狀態，不影響 Vercel 原生 cron 那一路（獨立運作，不互相
  依賴），§9 工單拆解會標出正確的部署順序。
- **失敗告警**：`curl --fail` 讓非 2xx 回應變成該次 job 失敗，觸發
  **GitHub Actions 原生的 workflow 失敗 email 通知**——這是目前唯一的
  告警管道（沿用平台原生機制，本輪不另外開發告警系統），實際收到通知
  的人取決於 repo 的 GitHub 通知設定（誰在 watch 這個 repo／組織通知
  偏好），這部分是 GitHub 帳號層級的設定，不是這支 workflow 檔案能
  控制的範圍，你可能需要另外確認一下通知有正確送達你自己。

`deposit-sweep` 不受這個結構性衝突影響（不需要 GitHub Actions 補位）——
見下方說明。

#### 為什麼 `deposit-sweep` 在零成本變體下沒有額外風險

`deposit-sweep` 唯一做的兩件事（`deposit_expiring_soon` 提醒、
`pending_deposit` lazy-expire）都只在有 `pending_deposit` 紀錄時才有
意義；§4.2 已裁決 `deposit_flow_enabled=false` 於 7-A 上線時關閉整條
訂金流程，代表**上線初期根本不會產生任何 `pending_deposit` 紀錄**，
`deposit-sweep` 不管排多頻繁都是在掃一張空表。零成本變體對它沒有實質
影響，保留一支每日 1 次的安全網（上面 `vercel.json` 範例裡的第二支）
只是防呆——等 `deposit_flow_enabled` 開啟那天，本來就要跟著把這支
cron 的頻率一起處理（見下方 Pro 升級觸發條件第一項），不用現在先煩惱。

`booking_confirmed` 完全不受這節任何討論影響——它不是 cron 觸發的，
是建立預約當下同步呼叫（見 B.4：「即時，不進排程」），§5.3「真實客人
第一筆推播」的驗收步驟在零成本變體下行為完全一致，不用另外調整。

#### Pro 升級：可選步驟，觸發條件

以下任一條件出現時，把 `release/booking-prod` 分支的 `vercel.json`
改回 `*/15`／`*/10`（改一個檔案，重新部署即生效，不需要動資料庫或
LINE 端設定），並確認 Vercel 帳號/team 已是 Pro 方案（帳號層級付費，
非逐 Project 收費，若這個 repo 所在的 team 已經因為其他專案是 Pro，
新專案自動享有，不用重複升級）：

1. **`deposit_flow_enabled` 要開啟時**（ECPay 正式金鑰到位，見 §4.2
   掛帳）——此時 `deposit-sweep` 的高頻率需求變成真的重要（客人在等
   付款連結，`pending_deposit` 的保留時長跟提醒精準度直接影響真實
   金流體驗），這是**最明確、幾乎不用討論的觸發點**。
2. 你認為 GitHub Actions 補位方案（Option C，見下方）的可靠度不夠、
   或維護一份 workflow 檔案的成本已經不划算，想直接統一回到 Vercel
   原生 `*/15`（`revisit_care` 目前已靠 Option C 保住獨立 12:35 時段，
   不是「一定要升 Pro 才能救回」，這項純粹是你想要更高保障或想簡化
   維護介面時的選項）。
3. 實際發生過一次「零成本變體單次失敗、當天提醒全部漏發」的事件，
   你評估這個風險型態不能接受。
4. §7.2 量化出的客量規模已經大到「單點失敗漏一整天提醒」的營運風險
   你覺得不值得再省這筆 Vercel 費用。

**工單拆解時的處置**：零成本變體（Hobby 每日 1 次 + GitHub Actions
雙時段補位）列為 7-A 第一階段的**預設實作範圍**；Pro 升級（改
`vercel.json` 頻率）列為**獨立、可選的後續工單**，不排進第一階段的
必要交付項，觸發條件出現才啟動。完整工單拆解見 §9。

---

## 3. 環境變數規劃（dev / production 完整對照表）

以下只列變數名與用途，**值你自己填 Vercel**，不進對話、不進本檔案。

### 3.1 開發環境（`.env.local`，本機，維持現狀不變）

已存在，不需異動，列在這裡是為了跟下方 production 表格對照：

| 變數 | 用途 |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` | 官網內容管理（Sanity CMS） |
| `NEXT_PUBLIC_SITE_URL` | 本機網址 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` / `SUPABASE_ACCESS_TOKEN` | 指向 `warmjar-dev` |
| `ADMIN_EMAILS` | 後台白名單信箱（dev 測試帳號） |
| `BOOKING_TOKEN_SECRET` | `/book`、`/member` session 簽章金鑰 |
| `ECPAY_ENV` / `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` | ECPay 測試環境（staging）金鑰 |
| `ECPAY_CALLBACK_BASE_URL` | cloudflared 通道網址，本機測試 ECPay webhook 用 |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | Messaging API channel（唯讀抄錄，夯客共用） |
| `LINE_CHANNEL_ACCESS_TOKEN` | 過渡期 fallback，可留空 |
| `LINE_LOGIN_CHANNEL_ID` | 自建 Login channel（`warmjar-booking`） |
| `NEXT_PUBLIC_LIFF_ID` | 自建 LIFF app ID |
| `CRON_SECRET` | 本機手動觸發 cron 用 |

### 3.2 正式環境（新 Vercel Project → Production 環境變數，**新建**）

| 變數 | 用途 | 與 dev 的差異 |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | 官網內容管理 | **與 dev 相同值**（Sanity 專案本來就是共用的內容庫，不分 dev/prod） |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset | 同上，沿用既有官網用的 dataset，不需另開 |
| `NEXT_PUBLIC_SITE_URL` | 正式網址，供內部產連結用（例如推播文案裡的店址連結、ECPay callback fallback） | 改成新子網域正式網址 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | **改指向 `warmjar-booking-prod`** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 同上，新專案的值 |
| `SUPABASE_SERVICE_ROLE_KEY` | 後端 service-role 存取（全站繞過 RLS 走應用層權限，沿用既有架構） | 同上，新專案的值，**高敏感度，只在 Vercel 環境變數設定，不落地任何檔案** |
| `DATABASE_URL` | 若有腳本/工具需要直連 DB 用 | 同上，新專案的值 |
| `SUPABASE_ACCESS_TOKEN` | Supabase 管理 API（若有用到） | 同上，新專案的值 |
| `ADMIN_EMAILS` | 後台白名單信箱 | **改成真實員工信箱清單**（不是 dev 測試帳號） |
| `BOOKING_TOKEN_SECRET` | session 簽章金鑰 | **必須換一組新的隨機值**，不可沿用 dev 的（dev 金鑰外洩風險與正式環境等級不同，且原本就該每個環境各自一把） |
| `ECPAY_ENV` | ECPay 環境開關 | **見 §4.2 已裁決：維持 `staging`**（`deposit_flow_enabled` 開關關閉） |
| `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` | ECPay 金鑰 | 若 `ECPAY_ENV` 維持 `staging`，沿用官方測試環境金鑰即可，**不需要正式金鑰**（見 §4.2） |
| `ECPAY_CALLBACK_BASE_URL` | 本機測試專用 | **正式環境刪除此變數**，讓程式 fallback 用 `NEXT_PUBLIC_SITE_URL`（`.env.example` 註解已載明這個 fallback 行為） |
| `LINE_CHANNEL_ID` | Messaging API channel ID | **與 dev 相同值**（同一支 channel，夯客共用，唯讀抄錄，不是「新開一個」） |
| `LINE_CHANNEL_SECRET` | Webhook 簽章驗證用（本輪不接 webhook，仍需填，供未來 Stage 6B 用） | 與 dev 相同值 |
| `LINE_CHANNEL_ACCESS_TOKEN` | 過渡期 fallback token | 建議**留空**（正式環境優先驗證 stateless token 路徑真的可靠，不留 fallback 拐杖；若 Token Manager 正式環境穩定運行有疑慮，可暫時填入再擇期移除，見既有 §2.1 fallback 棄用時程） |
| `LINE_LOGIN_CHANNEL_ID` | 自建 Login channel ID | 與 dev 相同值（同一支自建 channel，不需要正式環境另開一支——見下方說明） |
| `NEXT_PUBLIC_LIFF_ID` | 自建 LIFF app ID | 與 dev 相同值，**但 Console 端該 LIFF app 的 Endpoint URL 要改成正式網址**（見 §2.2，ID 不變，指向的網址變） |
| `CRON_SECRET` | 保護 `/api/cron/*` | **必須換一組新的隨機值**，不可沿用 dev |

**關於 LINE 相關變數為何 dev/production 用同一支 channel**：Stage 6A 的
LINE Login channel（`warmjar-booking`）跟 Messaging API channel
（2004034061）都只有一份，本來就是「開發期間用 cloudflared 網址測試、正式
環境改用正式網址」的**同一支** LIFF app 换 Endpoint URL，不是 dev/production
分別建两支 LIFF app——這跟 Supabase／ECPay 那種「dev 環境完全獨立一套」的
隔離邏輯不同，因為 LINE 的 channel／LIFF app 是跟「這支手機 App 對應的
LINE 官方帳號」綁定的資源，不是我們自己能無限複製的東西（複製一支代表又要
重新走一次 LIFF 審核與 Console 設定，且 userId 綁定關係也不通用）。這代表
**本機開發期間測試 LIFF 綁定，實質上是在操作同一支正式 LINE Login
channel**，只是資料庫端寫入的是 `warmjar-dev`——這件事本來就是 Stage 6A-1
驗收時的既有現實（見 `phase6-stage6a1-acceptance-guide.md` 使用「暘自己的
手機 LINE」測試），本輪沒有改變這個既有事實，只是明確寫出來避免誤解成
「正式環境會另開一支 LIFF」。

### 3.3 部署時你要親手填的值（設計層級的決定已全數定案，這裡只剩操作）

以下已不是「要不要」的設計問題（v2 已定案），純粹是部署當下要打進
Vercel／各 Console 的具體值：

- `NEXT_PUBLIC_SITE_URL`：`https://book.warmjar.com.tw`。
- `ADMIN_EMAILS`：正式環境的真實員工信箱清單（草案不代填，你決定名單）。
- Supabase 專案：新 organization「Warmjar-Booking」→ 專案
  `warmjar-booking-prod` → **Free 方案**（見 §1.4，Pro 升級觸發條件另定）。
- 其餘 Supabase／ECPay／LINE／`BOOKING_TOKEN_SECRET`／`CRON_SECRET` 等
  金鑰值：依 §3.2 表格逐項取得後填入 Vercel，不進本檔案、不進對話。

---

## 4. 範圍外明列 + ECPay 正式金鑰處理建議

### 4.1 明確排除在 7-A 之外

以下三項**不在本輪範圍**，維持掛在 `design-log.md` 既有「上線前基礎設施」
待辦帳本：

- **三竹簡訊（SMS provider）串接**——**v2 裁決：帳本重新定位為 Stage 7-B
  第一優先**（優先序高於 7-B 其他既定項目），明確用途是「解鎖客人遠端
  自助 LIFF 綁定」（不用到店裡、自己在家點 LINE 圖文選單就能完成綁定）。
  這不是把它拉回 7-A——7-A 的真實客人綁定改走 §4.3 的「櫃檯代客綁定」
  路徑，完全不依賴簡訊；三竹簡訊要解決的是「櫃檯代客綁定」覆蓋不到的
  情境（客人不在店裡），排進下一個 Stage 就能開始做，不用等到 Phase 7
  完整版。
- **正式環境 SMTP**——目前系統沒有任何 email 發送功能在使用中，維持掛帳，
  排序不變。
- **群發引擎**——`phase-6-line-integration-draft.md` C.3 已明確排除，本輪
  不變動這個決策，排序不變。

### 4.2 ECPay 正式金鑰處理：維持 `staging`，`deposit_flow_enabled` 開關關閉（v2 已裁決）

**v2 裁決結果：採「加明確開關」方案（下表 Option A），不依賴 `no_history`
巧合。** 以下說明保留 `no_history` 這個技術事實的分析（解釋「為什麼不能只
靠它」），但結論已定案，不再是待選項。

`evaluateDepositPolicy`（`src/lib/booking/depositPolicy.ts`）判斷要不要收
訂金，依據是**這位客人在本系統資料庫裡的歷史紀錄**（有沒有 no_show／遲取消
紀錄）。`warmjar-booking-prod` 是全新資料庫，**上線當下所有客人的歷史紀錄
都是空的**，`evaluateDepositPolicy` 對每一位客人的判定結果都會是
`reason: "no_history"` → `requiresDeposit: false`——也就是說，**在本系統
還沒累積出任何一筆自己的爽約/遲取消紀錄之前，訂金流程本來就不會被觸發**，
不需要額外寫程式去「關閉」它，維持 `ECPAY_ENV=staging` 這件事在現階段
**不會被客人感知到**（沒有人會走到需要付訂金這一步，所以也不會有人打開
ECPay 測試頁面）。

**但這裡有一個必須明確標出的風險，不是「反正用不到就沒事」**：一旦雙軌期
拉長到本系統自己累積出第一筆 no_show 或 1 小時內取消紀錄，`evaluateDepositPolicy`
就會開始對「下一次」預約要求訂金——這時如果 `ECPAY_ENV` 還是 `staging`，
系統會把客人導向 ECPay **測試環境**付款頁，真實客人在那個頁面**無法用真的
信用卡付真的錢**（測試環境本來就不接受真卡）。這不是「訂金流程被關閉」，
是「訂金流程被觸發但實際上壞掉」，兩者後果差很多——前者是預期行為，後者是
會讓客人在付款頁卡住的真實 bug。

**已裁決做法**：維持 `ECPAY_ENV=staging`，**新增**在 `system_settings` 一個
開關 `deposit_flow_enabled`（boolean），`/admin` 建單與 `/book` 建立預約時
（呼叫 `evaluateDepositPolicy` 前），先檢查這個開關——**關閉**時一律略過
訂金判定（等同全域 `manualWaiver`），不管 `evaluateDepositPolicy` 算出
什麼結果；**開啟**後才恢復依歷史紀錄正常判定。7-A 上線時這個開關值為
`false`（種子資料寫入，見 §1.2 新增 migration）。

實作落點（供 §實作階段參考，本輪先寫下設計，不動工）：
- `system_settings` 新增 key `deposit_flow_enabled`，型別沿用既有
  `jsonb value` 欄位（比照 `notification_schedule` 的既有寫法）。
- `evaluateDepositPolicy` 本身（純函式）**不改**——它的職責是「依歷史
  紀錄算出結果」，不該知道「現在整個系統要不要啟用訂金流程」這種運維
  層級的開關，職責會混在一起。改在**呼叫端**（`/book/create-appointment`
  跟 `/admin` 的 `createManualAppointment` 兩處建立預約的地方）讀
  `system_settings.deposit_flow_enabled`，關閉時直接不呼叫
  `evaluateDepositPolicy`（或呼叫後強制覆蓋 `requiresDeposit: false`），
  沿用既有「查表讀開關」的既有慣例（跟讀 `notification_schedule` 同一種
  查詢模式）。

**掛帳登錄**：`deposit_flow_enabled` 開啟時機掛進 `design-log.md` 待辦
帳本，登記為「ECPay 正式金鑰到位時啟用」——正式金鑰申請與開關開啟是
同一個時間點的兩個動作，不用分開排程。ECPay 正式金鑰本身可以延後到
「真的要開放線上付訂金」那天再申請跟填入，不影響本輪上線時程。

### 4.3 櫃檯代客綁定：7-A 主路徑（v2 已裁決，完整流程設計）

**裁決結果**：三竹簡訊不拉回 7-A（重新定位為 7-B 第一優先，見 §4.1），
7-A 的真實客人 LIFF 綁定改走全新的「櫃檯代客綁定」路徑，**完全不經過**
既有的 `/api/book/send-otp`／`/api/book/verify-otp`／`book_session` 這條
OTP 路徑——不是修改 OTP 程式碼讓它在某個條件下跳過，是**另開一條平行
路徑**，OTP 相關的既有程式碼一行都不動。這條新路徑目前**不存在於現有
程式庫**，以下是設計，不是既有功能的說明。

#### 為什麼可以完全跳過 OTP

OTP 在既有流程裡要證明的事情是「打電話/操作的這個人真的擁有這支手機」。
櫃檯代客綁定的情境下，這件事由**店員的目視核對**取代——客人人就站在
櫃檯前，店員看著這位客人的手機當場操作 LINE，這個物理事實本身就是比
OTP 更強的身分證明（OTP 也不過是「你能收到這支手機的簡訊」，跟「你人在
現場、手機在你自己手上」比起來，後者其實是更直接的證據），所以技術上
完全站得住腳跳過 OTP，不是為了偷懶繞過驗證。

#### 完整流程（櫃檯操作 3 步、客人操作 1 步）

```
【前提】客人已經是 customers 表裡的一筆紀錄（雙軌期客人多半經夯客/電話
        預約，櫃檯建單當下 createManualAppointment 就會 find-or-create
        這筆 customers 資料——不需要為了綁定另外新建客人）

── 櫃檯操作 ──────────────────────────────────────────────
Step 1  店員在 /admin 該客人的會員詳情頁（或當下建單完成的畫面）
        看到「產生 LINE 綁定連結」按鈕（僅未綁定客人顯示，已綁定
        客人這顆按鈕直接不出現，比照既有「LINE 已綁定/尚未綁定」
        C.1 狀態顯示邏輯）
           │
           ▼
Step 2  點擊按鈕 → 後端產生一組短效（建議 10 分鐘）簽章 token，
        內容只有 { customerId, expiresAt, issuedBy: 該店員 profile id }
        （沿用 signToken/verifyToken 既有機制，同一把
        BOOKING_TOKEN_SECRET，新增一種 payload kind
        "counter_bind_grant"，風格完全比照 otpSession.ts 既有的
        otp_challenge/booking_session/member_session 三種寫法）
        → 寫一筆 audit_logs（誰、對哪個客人、何時產生了綁定授權）
           │
           ▼
Step 3  畫面顯示這組 token 組成的 LIFF 深連結對應的 QR code：
        https://liff.line.me/{LIFF_ID}/member?bindGrant={token}
        （沿用 A.1 既有的 LIFF 路徑深連結機制，只是多帶一個 query
        參數；深連結是否透傳 query string，實作時第一件事就是拿
        自建 LIFF 實測確認，不是想當然爾）
        店員把畫面（或列印/螢幕）拿給客人，客人用手機 LINE 內建的
        QR 掃描器掃描
── 櫃檯操作結束 ──────────────────────────────────────────

── 客人操作 ──────────────────────────────────────────────
Step 1  掃描 QR → LINE 內建瀏覽器開啟 LIFF → liff.init() →
        liff.isLoggedIn() 為否時 liff.login()（LINE 官方登入
        畫面，客人按「允許」——這一步是任何 LIFF 首次開啟都躲不掉
        的標準流程，不是這個設計新增的額外步驟）→
        liff.getIDToken()
           │
           ▼ （前端自動處理，客人不需要再多做任何操作）
        MemberApp 讀出網址上的 bindGrant 參數，連同 idToken 一起
        呼叫新的 /api/member/counter-bind-complete
           │
           ▼ 後端：verifyLineIdToken(idToken) 拿到 lineUserId
             （一定要重新驗證，不信任 query string 帶來的任何東西
             除了拿去查 grant token 本身）
             verifyToken(grantToken) 確認 kind=counter_bind_grant
             且未過期 → 拿到 customerId
             → 綁定 customers(customerId) 的 profiles.line_user_id
               = lineUserId（新 helper，見下方）
             → clearLineNotifyBlockedFlag（沿用既有）
             → createMemberSession + 設 cookie（沿用既有）
        畫面顯示「綁定成功」，導向 /member 首頁
── 客人操作結束（全程 1 次點擊：掃 QR 後接受 LINE 授權，沒有第二步）──
```

#### 新增/修改的程式碼（範圍盤點，本輪只列不動工）

| 項目 | 說明 |
|---|---|
| `src/lib/member/counterBindGrant.ts`（新檔） | `createCounterBindGrant(customerId, issuedBy, secret)` / `verifyCounterBindGrant(token, secret)`，沿用 `signToken`/`verifyToken`（`src/lib/booking/signedToken.ts`），payload kind 定為 `"counter_bind_grant"`，風格比照 `otpSession.ts` |
| `bindLineUserIdToCustomer(supabase, customerId, lineUserId, displayName?)`（新函式） | 邏輯是 `findOrCreateCustomerForMember`（`src/lib/booking/customersForMember.ts`）尾段（49-66 行）的翻版，差別是不用「找/建 customer」（customerId 已知），只做「建/更新 profiles 並串 customers.profile_id」——實作時應該讓兩者共用同一段尾段邏輯，不要複製貼上一份幾乎一樣的程式碼（呼應 `design-log.md` 2026-07-11 條目「多入口優先抽共用函式」的既有紀律） |
| `/api/member/counter-bind-complete`（新 route） | 見上方流程；消費 token 的邊界情況與單次失效設計見下方獨立小節 |
| `/admin` 會員詳情頁（或建單完成畫面）新增「產生 LINE 綁定連結」按鈕 + QR 顯示元件 | 權限比照 C.2 手動單發（manager/owner 皆可，不是 owner 限定——理由相同：這不是移動金錢或高風險操作） |
| **新增依賴**：QR code 產生套件（例如 `qrcode`） | 專案目前沒有任何 QR 產生能力，這是本輪唯一新增的 npm 依賴（比照 Phase 6 當時新增 `@line/liff` 的先例，一併在這裡列出讓你知道） |
| `audit_logs` 寫入 | 產生綁定連結（誰對誰）算一筆敏感操作，比照 CLAUDE.md「所有敏感操作寫 audit_logs」的既有紀律 |

#### 單次失效設計（v2 追加，判斷結果：輕量實作，不降級為文件註明）

你給的兩個選項是「audit_logs 查重」或「成本過高就降級為已知風險」，這裡
判斷後選了**第三條、比 audit_logs 查重更輕、且沒有競態漏洞**的做法，
說明選它的理由：

**為什麼不直接用 audit_logs 查重**：audit_logs 是日誌表，不是設計來當
併發控制用的——「查一筆存不存在、不存在就寫入」這個 check-then-write
模式，兩個幾乎同時的請求會同時查到「不存在」，然後都寫入成功，等於沒
真的擋住併發消費（除非另外在 audit_logs 加一個 unique index 把它硬幹
成併發鎖，但那就不是「查重」這麼簡單了，而且用日誌表做鎖是概念上的
誤用）。

**實際做法：重用 `profiles.line_user_id`／`customers.profile_id` 本身
「從 NULL 變非 NULL 只會發生一次」這個天然狀態轉換**，不需要新表、新
欄位、新索引：

```
consumeGrant(customerId, lineUserId):
  查 customers(customerId) 拿 profile_id

  情況 A：profile_id 已存在（這位客人本來就有 profiles 列，只是還沒
          綁 LINE，line_user_id 應為 NULL）
    → 條件式 UPDATE：
        UPDATE profiles SET line_user_id = :lineUserId
        WHERE id = :profileId AND line_user_id IS NULL
      （Supabase JS：.update(...).eq('id', profileId).is('line_user_id', null)）
    → 有影響到列（贏了）：成功，token 視為已消費
    → 沒有影響到列（輸了，line_user_id 已被設過）：
        重新查一次目前的 line_user_id
        → 等於 lineUserId 本人（同一人重試/網路重送）：視為成功
          （冪等，不擋，直接照樣簽發 member_session）
        → 不等於（別人先搶到了，或這位客人早就綁過別的 LINE）：
          回錯誤「此連結已失效或客人已綁定」，寫 audit_logs 記一筆
          異常（不是攻擊就一定成立，但值得留痕）

  情況 B：profile_id 不存在（這位客人從來沒有 profiles 列）
    → 新建 profiles(line_user_id=:lineUserId, ...)
    → 條件式 UPDATE：
        UPDATE customers SET profile_id = :newProfileId
        WHERE id = :customerId AND profile_id IS NULL
    → 沒有影響到列（同一時間有兩個請求都在幫同一個從未綁過的客人
      建立第一支 profiles，另一個先贏了）：這是唯一沒有完全堵死的
      競態窗口，機率極低（需要同一組 10 分鐘 QR 被兩支不同 LINE
      帳號幾乎同時掃描，且都剛好是這位客人「這輩子第一次」建立
      profiles 列的時間點）——**這個殘餘風險等級判斷為可接受，
      文件記錄即可，不再加碼工程**，理由是它跟
      `findOrCreateCustomerForMember`（`customersForMember.ts` 33-46
      行，針對「同一支新手機併發首次綁定」）本來就已經在容忍的
      同一類競態屬於同一等級，現有程式碼從 Phase 6 上線至今就是這樣
      處理（捕捉 Postgres 23505 unique violation 後重查一次），這裡
      比照辦理即可，不需要為了這一個新入口另外發明更嚴謹的機制。
```

這個做法比「audit_logs 查重」更輕（不用多寫一張消費紀錄、不用額外
`SELECT` 判斷），而且情況 A（客人已有 profiles 列，例如老客人經
`/book` 或門市留過資料）用條件式 `UPDATE ... WHERE line_user_id IS NULL`
是資料庫層級原子操作，**沒有**查重法會有的 TOCTOU 漏洞；只有情況 B
（全新客人第一次建立 profiles 列）還留一個極窄殘餘窗口，判斷後**降級
為文件註明的已知風險**（對應你給的第二個選項），不是整個單次失效設計
都降級。

**其餘安全取捨（不變）**：

- Token 本身仍是短效 10 分鐘 + 物理交付作為第一層防護——上面的原子
  更新是第二層（就算 token 在有效期內被非預期的人拿到，也只有第一個
  成功呼叫的人能真的綁定）。
- 這條路徑**只解決臨櫃當面情境**，客人自己在家點圖文選單想遠端綁定，
  這個按鈕幫不上忙（那是 §4.1 提到 7-B 三竹簡訊要解決的事）。

---

## 5. 上線驗收標準草稿

分兩段：上線前基礎設施檢查（一次性），跟上線當天真實客人第一筆綁定/推播
的確認方式（真正的驗收動作）。

### 5.1 上線前檢查清單

- [ ] `warmjar-booking-prod` 建立完成，10 個 migration 依序執行成功（§1.2）
- [ ] `message_templates`（5 筆）、`stored_value_plans`（3 筆）核對存在
- [ ] 真實師傅名單、真實服務價目表已透過 `/admin` 手動輸入（**不是** demo 資料）
- [ ] 新 Vercel Project 建立，Production Branch 指向 `release/booking-prod`
- [ ] 新子網域 DNS 設定完成，Vercel 顯示已驗證
- [ ] 正式環境變數全數填妥（§3.2 表格逐項核對，`BOOKING_TOKEN_SECRET`／
      `CRON_SECRET` 確認是**新產生**的值，不是複製 dev 的）
- [ ] `release/booking-prod` 的 `vercel.json` 已改成零成本變體排程
      （§2.3 變體 A，`5 12 * * *` / `10 12 * * *`），手動觸發驗證這兩支
      route 在正式環境確實回應成功（Pro 方案**不是**第一階段必要前提，
      除非你已決定跳過零成本階段直接上 Pro）
- [ ] §2.3「`revisit_care` 結構性衝突」已裁決 Option C（GitHub Actions），
      落實項目：GitHub repository secret `CRON_SECRET` 已設定（你親手
      操作，值與 §3.2 Vercel Production 環境變數一致——
      `.github/workflows/notifications-cron.yml` 內的網址已回填為
      `book.warmjar.com.tw`，不用再改），用 `workflow_dispatch` 手動
      觸發一次確認回應成功（而不是等排程時間到才第一次驗證）
- [ ] `warmjar-booking` LIFF app 的 Endpoint URL 已改成正式網址（§2.2）
- [ ] §4.2 `system_settings` 已寫入 `deposit_flow_enabled: false`（新
      migration，見下方新增項）
- [ ] §5.4 `system_settings` 已寫入 `push_enabled: true`（同一支新
      migration）
- [ ] §4.3 櫃檯代客綁定路徑已實作並本機測試過至少一次完整流程（含 QR
      深連結確實透傳 `bindGrant` 參數——這是實作時第一件要驗證的技術
      前提，不是想當然爾）
- [ ] 手動觸發一次正式環境 `/api/cron/notifications`（帶正式 `CRON_SECRET`），
      確認 401（未帶密鑰）與正常回應（帶正確密鑰）行為都正確
- [ ] `/admin` 用真實員工帳號（不是 dev 測試帳號）登入成功

### 5.2 真實客人第一筆綁定的確認方式

不用測試帳號，用**第一位真的走完流程的真實客人**：

1. 該客人完成 LIFF 綁定（依 §4.3 決定的路徑）後，查
   `warmjar-booking-prod`（不是 dev！）的 `profiles` 表，確認出現一筆
   `role='customer'`、`line_user_id` 有值的紀錄，且透過 `customers.profile_id`
   關聯到正確的 `customers` 列（若是老客人，`customers.phone` 應該對得上
   店內既有資料；若非老客人，是新建的 `customers` 列）。
2. 確認 `notifications_log` 沒有任何跟這位客人相關的 `failed` 紀錄
   （綁定流程本身不寫 `notifications_log`，但緊接著的第一筆推播會）。

### 5.3 真實客人第一筆推播的確認方式

1. 該客人（已完成綁定）由店員在 `/admin` 建立第一筆真實預約
   （`createManualAppointment`）。
2. 觀察該客人手機，確認收到 `booking_confirmed` 推播，內容（姓名/時間/
   師傅/項目）與剛建立的預約相符。
3. 查 `warmjar-booking-prod` 的 `notifications_log`，該筆 `template_key
   ='booking_confirmed'` 狀態為 `sent`。
4. 查正式環境 server log，確認 `[tokenManager]` 印出 `issued new token`
   或 `cache hit`（**不是** fallback WARN）——這代表正式環境 Token Manager
   真的用 stateless token 在跑，不是靠 `LINE_CHANNEL_ACCESS_TOKEN` 撐著
   （若 §3.2 建議的「正式環境留空 fallback token」被採納，這一步同時也是
   在驗證「留空後系統仍正常運作」，等同一次隱性的 fallback 移除前置測試）。
5. `/admin` 日結報表「LINE 訊息額度」區塊，確認顯示的用量數字有反映這一筆
   （用量 +1，或至少能確認讀取到的是 `warmjar-booking-prod` 環境對應的
   真實 channel 用量，不是誤讀 dev 環境快取的舊數字）。

### 5.4 緊急關閉開關（上線後的安全閥）— v2 已採納，納入實作範圍

Stage 6A-1 至今只對測試帳號推播，這輪起是對真實客人推播，若上線後發現
任何異常（例如某個範本渲染錯誤、推播內容跟預期不符、或額度消耗異常），
目前**沒有不重新部署就能立刻停止推播**的方式。做法：`system_settings`
新增 `push_enabled`（boolean，預設 `true`，見 §1.2 新增 migration）,
`sendNotification` 一開始就檢查這個值，`false` 時直接寫
`status='skipped'`（原因記 `push_disabled_by_admin` 之類的字串）並返回，
不呼叫任何 LINE API。`/admin` 加一個小小的手動切換入口（owner 限定，比照
其他高風險設定的權限層級——這顆開關能讓全店推播瞬間停擺，跟退費/改抽成率
同一等級，不比照 §4.3 綁定按鈕的 manager/owner 皆可）。

換來的是「上線後真的出事時，能在幾秒內按掉，不用等重新部署」——上線前是
測試帳號出錯頂多自己尷尬，上線後是真實客人會收到錯誤內容的推播，風險
等級不同，值得這個小小的保險。

---

## 6. 6A-2（電子同意書）排程並行，但讓位給 7-A

6A-2（電子同意書簽署，範圍見 `phase6-stage-split-design.md` §2.5）已於
2026-07-21 決議「6A-1 關閉後立即接續」排入設計草案階段。本輪決策不撤銷
這個排程，但**主線開發資源優先 7-A**——7-A 是「讓已完成的功能開始服務真人」，
6A-2 是「開發一個全新功能」，兩者不衝突（不同程式路徑、不共用關鍵資源），
可以並行推進，但若時間/人力有限需要取捨，7-A 優先。

實務排法：7-A 基礎設施（本檔案 §1～§5）先落地並確認可上線，6A-2 設計草案
（獨立文件，不在本檔案展開）可以在 7-A 實作期間同步撰寫，但 6A-2 的**實作**
排到 7-A 上線驗收通過之後再開始，避免兩條開發線同時搶同一批注意力導致
兩邊都做不細。

---

## 7. 安全鐵律專節：夯客零影響論證

### 7.1 逐項列出 7-A 所有動作與夯客共用資源的接觸面

沿用 `phase6-stage-split-design.md` §一的資源衝突地圖，本輪新增/變動的
只有下面這些：

| 7-A 動作 | 接觸的資源 | 是否夯客共用資源 | 影響評估 |
|---|---|---|---|
| 正式環境用 stateless token 呼叫 Push API | Messaging API channel 的訊息額度（月配額） | ✅ 共用（OA 層級） | **唯一有實質影響的接觸面**，量化見 §7.2，不是新的接觸面種類（6A-1 驗收時已用同一支 channel 打過 push，只是這次是正式音量、對象是真實客人不是測試帳號） |
| 正式環境呼叫 `GET /v2/bot/profile/{userId}`（unfollow 偵測前置檢查） | 該支 API 自己的 rate limit（不計入訊息額度） | 技術上共用同一支 channel 的 API 配額，但與訊息額度是分開的計數器 | 影響極小，6A-1 已驗證過此呼叫模式，正式環境只是量增加 |
| 正式環境呼叫 `GET /v2/bot/message/quota`／`quota/consumption`（額度監控） | 讀取用量數字，不消耗訊息額度 | 唯讀查詢，不影響 | 無影響 |
| 修改自建 LIFF app（`warmjar-booking` Login channel 底下）的 Endpoint URL | **我方自建資源**，不是夯客資源 | ❌ 非共用 | 無影響，但操作時人工核對 LIFF ID 避免手滑點錯到旁邊夯客的 Login channel「溫罐子」（唯讀禁區） |
| 新建 Vercel Project、新子網域 | 完全獨立的部署基礎設施 | ❌ 非共用，跟 LINE/夯客無關 | 無影響 |
| 新建 Supabase 正式專案 | 完全獨立的資料庫 | ❌ 非共用 | 無影響 |

**結論**：7-A 沒有新增任何「碰觸共用資源的動作種類」——所有會碰到夯客
共用資源（訊息額度、GetProfile 配額）的呼叫模式，6A-1 已經在測試環境跑過、
驗證過安全，7-A 只是把同樣的呼叫模式從「測試帳號、低音量」換成「真實
客人、正式音量」。**唯一需要重新評估的是音量本身是否會撐爆共用額度**，
不是接觸面本身的風險，見下方 §7.2 量化。

**🔴 無任何新增碰觸共用資源的設計項目**——若你在確認過程中認為上表遺漏了
什麼接觸面，或對「唯讀修改自建 LIFF Endpoint URL」這項有疑慮，請指出，
本節會依你的裁決調整。

### 7.2 上線前推播量估算 vs. OA 方案額度（v2 定案：gate 通過）

**已知數字（你查證自 manager.line.biz）**：

| 項目 | 數字 |
|---|---|
| OA 方案級距 | 高用量，月配額 **6,000** 則 |
| 夯客目前月用量 | **3,189** 則 |
| 目前剩餘額度（7-A 新增前） | 2,811 則 |
| 7-A 新增估算 | 日均 10 筆 × 2 則保守值 ≈ **600 則/月** |
| 合計（夯客既有 + 7-A 新增） | 3,189 + 600 = **3,789 則，佔 6,000 配額約 63%** |

**Gate 結論：通過。** 63% 用量在配額之內，有餘裕，**OA 方案本輪不需要
升級**。

**內部一致性檢查（附加，不影響你的結論）**：本節較早的估算公式是
`booking_confirmed + reminder_day_before + revisit_care` 三種範本各約
1×N，合計約 3×N；你這裡用的是「每筆 2 則」的保守值，比 3×N 略低。用
較不保守的 3× 重算一次當作敏感度測試：日均 10 筆 × 3 則 ≈ 900 則/月，
合計 3,189 + 900 = 4,089 則，佔 6,000 配額約 68%，**仍在你設定的
5,000 監控線之下，gate 結論不受影響**——列出這個交叉核對只是確認
「2 則保守值」跟文件較早的公式沒有互相矛盾，不是質疑你的數字，兩種
算法下結論一致。

**監控線（v2 新增，上線後持續生效）**：月用量達到 **5,000 則**時，
回報並討論是否加購/升級方案（5,000／6,000 ≈ 83%，留約 1,000 則的緩衝
才觸發討論，不是等到真的滿了才反應）。監控資料來源沿用 Stage 6A-1
已經做好的 `/admin` 日結報表「LINE 訊息額度」區塊（§2.6 既有機制），
不需要新開發告警功能，本輪只是把「5,000」這個數字訂為你自己人工巡檢
時的判斷基準線，不是系統自動觸發的告警（本輪不排入自動告警開發範圍）。

### 7.3 禁區清單（原封延續，本輪無變動）

沿用 `phase6-stage-split-design.md`「範圍外」清單，本輪沒有新增任何一條，
逐項重申：

- ❌ 不點擊 long-lived token 的「Issue / Reissue」
- ❌ 不修改 Webhook URL、不切換 Use webhook 開關、不按 Verify
- ❌ 不建立或設定任何 Rich Menu（含 API 呼叫 set default）
- ❌ 不動 manager.line.biz 的自動回覆、歡迎訊息、任何 OA 設定
- ❌ 不編輯、不刪除夯客既有的 LIFF app
- ❌ 不編輯、不刪除夯客既有的 LINE Login channel「溫罐子」
- ❌ 不在 Console 刪除或修改任何非自建的資源

---

## 8. 最終決策總覽（v2 定案，全部項目已回填/裁決）

所有原本待你決定的項目均已回填，本檔案正式定案，狀態見文件頂部。彙總表：

| 項目 | 決定 | 章節 |
|---|---|---|
| 正式資料庫 | 新開獨立 Supabase organization「Warmjar-Booking」→ 專案 `warmjar-booking-prod`，**Free 方案**起步；新 org 建立被拒的 fallback（既有 org 升 Pro）屆時再議 | §1.1／§1.4 |
| 備份策略 | Free 方案無平台自動備份，人工週匯出為第一階段主要防線；Pro 升級硬觸發點＝「Stage 6B 前置作業啟動、資料轉正之前」 | §1.4 |
| Preview 環境 Supabase 連線 | 沿用 `warmjar-dev` | §1.3 |
| 部署形態 | 同 repo 新 Vercel Project，Production Branch `release/booking-prod`，子網域 **`book.warmjar.com.tw`** | §2.1 |
| LIFF Endpoint | 改為 `https://book.warmjar.com.tw/`（等 DNS/部署確認可連通後再切） | §2.2 |
| Cron 第一階段 | **零成本起步變體**：Vercel Hobby 每日 1 次（20:05／20:10 台灣時間）+ GitHub Actions 補位 `revisit_care`（12:35）與 `reminder_day_before`（20:05 雙保險），已落地 `.github/workflows/notifications-cron.yml` | §2.3 |
| Vercel Pro | 非第一階段必要項，觸發條件見 §2.3（`deposit_flow_enabled` 開啟／`revisit_care` 需求變化／實際漏發事件／客量規模） | §2.3 |
| ECPay | 維持 `staging`，新增 `deposit_flow_enabled` 開關（上線時 `false`），正式金鑰到位時開啟 | §4.2 |
| LIFF 首次綁定 | 「櫃檯代客綁定」（QR/深連結，完全跳過 OTP），含單次失效原子更新設計 | §4.3 |
| 三竹簡訊 | 重新定位為 Stage 7-B 第一優先（解鎖遠端自助綁定） | §4.1 |
| 緊急關閉開關 | `push_enabled`（owner 限定） | §5.4 |
| 推播額度 gate | **通過**——夯客 3,189 ＋ 7-A 新增 ≈600 ＝ 3,789／6,000（63%），監控線 5,000 | §7.2 |

本檔案狀態改為「已定案」，`design-log.md` 已補一筆摘要（見該檔案對應
日期條目）。§9 是本輪產出的實作工單拆解，等你明確下令才開工。

---

## 9. 實作工單拆解（依賴順序排列，零成本變體為預設範圍）

**目前為止唯一已經落地的東西**：本檔案本身、`.github/workflows/notifications-cron.yml`。
以下全部是**尚未動工**的工單，等你下令才開始。分四波：Wave 0（你的
操作，多數可以立刻平行開始，不用等 code）、Wave 1／Wave 2（code，依
內部依賴分兩波）、Wave 3（收尾與驗收，依賴前面全部完成）。**條件工單**
（Pro／付費相關）獨立列在最後，不算第一階段預設範圍，觸發條件出現才
啟動。

### Wave 0：你的操作（多數可立即開始，部分有內部先後順序）

| 編號 | 內容 | 依賴 |
|---|---|---|
| W0-1 | 建立 Supabase organization「Warmjar-Booking」→ 專案 `warmjar-booking-prod`（Free 方案）。若新 org 建立被拒，走 §1.1 fallback（既有 org 升 Pro），屆時回來調整這張工單 | 無 |
| W0-2 | 對 `warmjar-booking-prod` 依序執行既有 10 支 migration（§1.2） | W0-1 |
| W0-3 | 從 `feature/booking-system` 切出 `release/booking-prod` 長期分支 | 無 |
| W0-4 | 新建 Vercel Project，Production Branch 指向 `release/booking-prod`，綁定 `book.warmjar.com.tw` + DNS 設定 | W0-3 |
| W0-5 | 正式環境變數填入 Vercel Production（§3.2 全表，`BOOKING_TOKEN_SECRET`／`CRON_SECRET` 自行產生新值，不沿用 dev） | W0-1（要有 Supabase URL/keys 才有值可填）、W0-4（要有 Project 才能填） |
| W0-6 | GitHub repository secret `CRON_SECRET` 設定（值＝W0-5 填的同一組） | W0-5 |
| W0-7 | LINE Console：`warmjar-booking` Login channel 的 LIFF Endpoint URL 改為 `https://book.warmjar.com.tw/`（§2.2 建議等 W0-4 部署確認可連通後再切，避免空窗期） | 建議在 W0-4 之後 |
| W0-8 | `/admin` 手動輸入真實師傅名單、真實服務價目表到 `warmjar-booking-prod`（不是 demo 資料） | W0-2 |
| W0-9 | 決定 `ADMIN_EMAILS` 真實員工信箱清單並填入 Vercel | 無（可隨時做） |

### Wave 1：Code（無內部依賴，可立即動工，可與 Wave 0 並行）—— ✅ 已完成 2026-07-22

| 編號 | 內容 | 依賴 | 狀態 |
|---|---|---|---|
| C1-1 | 新增第 11 支 migration（`system_settings` 寫入 `deposit_flow_enabled=false`、`push_enabled=true`，§1.2/§4.2/§5.4），先套用到 `warmjar-dev` 驗證 | 無 | ✅ 已套用到 `warmjar-dev` 並核對 |
| C1-2 | `src/lib/member/counterBindGrant.ts`（`createCounterBindGrant`／`verifyCounterBindGrant`，§4.3） | 無 | ✅ 完成，7 個測試案例 |
| C1-3 | `bindLineUserIdToCustomer` helper，與 `findOrCreateCustomerForMember` 尾段共用邏輯重構（§4.3） | 無 | ✅ 完成，2 個測試案例（純函式部分）；IO 部分依既有慣例不直接測，詳見 `design-log.md` 2026-07-22 條目 |

259 個測試案例（+9）、tsc／lint／build 全過，細節見
[design-log.md](design-log.md) 2026-07-22「Phase 7-A 開工」條目。

### Wave 2：Code（依賴 Wave 1）—— ✅ 已完成 2026-07-22

| 編號 | 內容 | 依賴 | 狀態 |
|---|---|---|---|
| C2-1 | `evaluateDepositPolicy` 呼叫端讀 `deposit_flow_enabled` 開關（§4.2） | C1-1（dev 已套用） | ✅ 完成，**範圍修正**：只接在 `/book/create-appointment`——`createManualAppointment` 這條路徑本來就一律直接 `confirmed`、從不呼叫 `evaluateDepositPolicy`（見該檔案既有註解），原票「兩處都接」的描述不準確，實作時核對程式碼才發現，改用既有 `manualWaiver` 參數達成（`evaluateDepositPolicy` 純函式本身沒改） |
| C2-2 | `sendNotification` 讀 `push_enabled` 開關 + `/admin` owner 限定切換 UI（§5.4） | C1-1（dev 已套用） | ✅ 完成，UI 放在既有 `/admin/message-templates` 頁面最上方（跟通知相關設定同一頁），沒有另開新頁面 |
| C2-3 | `/api/member/counter-bind-complete` route（含單次失效原子更新邏輯）+ 新增 `qrcode` 依賴 + `/admin`「產生 LINE 綁定連結」按鈕與 QR 顯示元件 + `audit_logs` 寫入（§4.3） | C1-2、C1-3 | ✅ 完成，按鈕放在會員詳情頁（跟既有「發送 LINE 訊息」對稱位置，未綁定客人才顯示），`MemberApp.tsx` 新增 `bindGrant` query 參數分支（跳過既有 liff-bind 流程，不改動它） |

細節與測試結果見 [design-log.md](design-log.md) 2026-07-22 條目。

### Wave 3：收尾與驗收（依賴 Wave 0 + Wave 1 + Wave 2 全部完成）—— 驗收劇本已產出，狀態待執行

正式驗收劇本已落檔：
[phase7a-wave3-acceptance-guide.md](phase7a-wave3-acceptance-guide.md)
（比照 6A-1 格式），涵蓋 F-1～F-5 全部項目，逐步操作/預期結果/實際
結果表格已展開，不在這裡重複列。

| 編號 | 內容 | 依賴 | 對應驗收劇本章節 |
|---|---|---|---|
| F-1 | 把 C1-1 的 migration 套用到 `warmjar-booking-prod` | W0-2、C1-1 | 零、前置條件 |
| F-2 | 確認 `release/booking-prod` 的 `vercel.json` 是零成本變體排程，部署後手動觸發驗證兩支 route 回應成功 | W0-4 | 一 |
| F-3 | `workflow_dispatch` 手動觸發一次 `notifications-cron.yml`，確認能連通正式環境並回應成功 | W0-4、W0-6、W0-7 | 一 |
| F-3b | 櫃檯綁定 race-safe 手動驗證（你的裁決）：兩支不同 LINE 帳號依序掃描同一位未綁定客人的兩組 grant，第二支帳號應收到衝突拒絕、`profiles.line_user_id` 不被覆蓋 | C2-3 | 二（2B） |
| F-3c | **（新增，你的裁決）**`push_enabled=false` 觸發通知，驗證 `notifications_log` 留下 `skipped` 紀錄——**已核對程式碼確認會留下紀錄**（`finish()` 對任何結果都無條件寫入，`error_message` 記 `push_disabled_by_admin`），劇本裡是拿真機結果核對這個判讀，不是懸而未決的問題 | C2-2 | 三 |
| F-3d | **（新增，你的裁決）**`deposit_flow_enabled=false` 時，有爽約紀錄的測試會員走 `/book`，驗證不觸發訂金、直接 `confirmed`；額外加測開關打開時同一位客人確實會被要求訂金，兩態都測才算真正驗證語意正確 | C2-1 | 四 |
| F-4 | §5.1 上線前檢查清單逐項核對 | Wave 0 + 1 + 2 全部 | 零 |
| F-5 | §5.2／§5.3 真實客人第一筆綁定/推播驗證 | 前四區全過 + 測試資料已清理，且需要真的有第一位客人配合（時間點你決定） | 五 |

### 條件工單（Pro／付費相關，觸發才啟動，不算第一階段預設範圍）

| 編號 | 內容 | 觸發條件 |
|---|---|---|
| P-1 | Vercel 升級 Pro + `vercel.json` 改回 `*/15`／`*/10` | §2.3 四項觸發條件任一（`deposit_flow_enabled` 開啟／`revisit_care` 需求變化／實際漏發事件／客量規模） |
| P-2 | Supabase `warmjar-booking-prod` 升級 Pro | §1.4：Stage 6B 前置作業啟動前（硬性），或你評估儲值資料量提前決定 |
| P-3 | `LINE_CHANNEL_ACCESS_TOKEN` fallback 正式移除 | 既有 Stage 6A-1 時程項目（Token Manager 穩定運行兩週無 fallback 觸發），非本輪新增，順手列出提醒別漏 |
| P-4 | OA 方案加購/升級 | §7.2 監控線：月用量達 5,000 則 |
| P-5 | 管理端 LINE 解綁功能（`/admin` 新增按鈕：清除某客人的 `profiles.line_user_id`，讓下一次綁定不再撞衝突） | 7-B，或 §4.3 單次失效機制的衝突分支（`already_bound_to_different_line_user`）在正式環境首次真的發生時（見下方過渡期手工解法） |

**P-5 過渡期手工解法（Wave 2 完成即可用，不用等 P-5 排入）**：客人更換
LINE 帳號、舊 userId 卡位導致新綁定拋 409 衝突時，owner 登入
`warmjar-booking-prod` 的 Supabase SQL Editor，執行：

```sql
UPDATE profiles SET line_user_id = NULL
WHERE id = (SELECT profile_id FROM customers WHERE id = '<customer_id>');
```

執行後客人可以重新走一次櫃檯代客綁定。**這是原始 SQL 直接改資料庫，
沒有 `audit_logs` 留痕**（跟 App 內操作不同），操作者請自行記一筆
（時間/客人/原因），只限 owner 執行。

以上為完整拆解，等你下令即可依波次開工。
