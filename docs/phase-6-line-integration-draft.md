# Phase 6：LINE 整合（LIFF 會員 + Messaging API 通知）— 設計草案

> 狀態：**草案，待確認** — 本檔案只描述資料結構、流程與設定步驟，
> 尚未實作。確認後刪除本行、把「狀態」改成「已定案 YYYY-MM-DD」，並在
> [design-log.md](design-log.md) 補一筆摘要。金鑰一律走環境變數，
> 本檔案不會出現任何實際金鑰值。

## 0. 現有 schema 盤點（好消息：地基 Phase 1 就打好了）

`profiles` 表在 Phase 1 就已經長這樣：

```sql
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            text NOT NULL CHECK (role IN ('owner','manager','staff','customer')),
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  line_user_id    text UNIQUE,
  display_name    text,
  phone           text,
  avatar_url      text,
  is_active       boolean NOT NULL DEFAULT true,
  ...
);
```

`role` 本來就包含 `'customer'`，`line_user_id` 欄位也已經在——顯然
Phase 1 設計時就預留了 LINE 身分要掛在 `profiles`，不是掛在
`customers` 上。`customers.profile_id` 早就有 `UNIQUE REFERENCES
profiles(id)`。所以「客人 ↔ LINE 身分」的關聯欄位**完全不需要新
migration**，這輪要做的是：

1. 把「用 `line_user_id` 找/建 `profiles` 列、再串到 `customers`」的
   實際流程接上（目前完全沒有程式碼在用這條路徑）。
2. 補通知需要的新表：`message_templates`（範本）、
   `notifications_log`（發送紀錄）——這兩張 Phase 1 沒預留。
3. `customers` 補一個方便查詢用的**冗餘欄位**
   `line_bound boolean generated always as (profile_id is not null and
   exists(...))`——不，這樣做不到（generated column 不能查其他表）。
   改用最簡單的做法：後台會員列表/詳情直接 `left join profiles`
   查 `profiles.line_user_id is not null`，不加冗餘欄位，維持既有
   「不为查询方便就加快取字段」的風格（跟 Phase 5 儲值餘額查詢用
   `stored_value_accounts` 而不是在 `customers` 加欄位一致）。

真正的缺口：

1. **`message_templates` 表不存在**——B.6 要求的範本管理需要它。
2. **`notifications_log` 表不存在**——B.6 要求的發送紀錄需要它。
3. **沒有任何程式碼在讀寫 `profiles.line_user_id`**——LIFF 綁定、
   Messaging API 發送對象解析，都要從零接。
4. **`/member` 路由完全不存在**——整個會員專區是新建。
5. **沒有「客人自行取消」這條路徑**——現有 `appointments` 取消只有
   後台 `cancel` 這個 admin action（`cancel_reason: 'admin_cancelled'`
   寫死），客人自助取消需要一個新的、權限完全不同的入口。

---

## A. LINE Login + LIFF（客人免帳號）

### A.0 關鍵設定：LIFF 要建在 Messaging API 頻道底下，不要另開 LINE Login 頻道

這點錯了會很難查——**LINE 的 userId 是以「頻道」為範圍隔離的**。如果
LIFF app 建在獨立的 LINE Login 頻道，`liff.getIDToken()` 解出來的
`sub`（userId）會跟 Messaging API 頻道 push 訊息時用的 userId **不是
同一個值**，會導致「客人明明綁定了，卻收不到任何推播」——因為系統
拿去 push 的 `line_user_id` 對 Messaging API 頻道來說根本不認得這個人。

正確做法：在 LINE Developers Console 的 **Messaging API 頻道**底下的
「LIFF」分頁直接新增 LIFF app（不要建立獨立 Channel）。這樣 LIFF 登入
拿到的 userId 就跟 Messaging API 用來 push 的 userId 是同一個
namespace，兩邊天生對得上。詳細步驟見第 E 節。

### A.1 一個 LIFF app，兩個入口（`/book` 與 `/member`）

不需要為 `/book` 跟 `/member`各開一個 LIFF app。LIFF 支援「路徑深連結」
：LIFF 的 Endpoint URL 設成網站根目錄（`https://{domain}/`），LINE
圖文選單的按鈕連到 `https://liff.line.me/{liffId}/book` 或
`https://liff.line.me/{liffId}/member`，LINE 內建瀏覽器會把 LIFF ID
後面的路徑原樣接到 Endpoint URL 後面打開，效果等同直接開
`https://{domain}/book`。一個 LIFF ID、一個 `NEXT_PUBLIC_LIFF_ID`
環境變數就夠。

### A.2 LIFF SDK 載入方式

專案目前完全沒有引入任何 LINE SDK（`package.json` 確認過）。LIFF SDK
官方建議用 `<script src="https://static.line-scdn.net/liff/edge/2/sdk.js">`
CDN 載入（比 npm 套件 `@line/liff` 版本更新更快），走
`next/script` 的 `strategy="beforeInteractive"` 或在 client component
裡動態 `import` npm 版都可以——**建議用 npm 套件 `@line/liff`**（型別
完整、跟 Next.js App Router 的 client component 生命週期比較好搭，
CDN 版拿到的是 `window.liff` 全域變數，TypeScript 支援較差）。這是本
輪唯一新增的 npm 依賴。

Messaging API 呼叫（push/reply）跟 webhook 簽章驗證這兩塊，比照
ECPay 的既有風格（`ecpayCheckMac.ts`／`ecpayConfig.ts`）**手刻，不用
`@line/bot-sdk`**——LINE 的 REST API 本身就是單純的 JSON POST，官方
SDK 主要是省麻煩，但這個專案至今沒有為任何第三方服務引入官方 SDK
（ECPay 也是手刻 CheckMacValue），維持風格一致、依賴數量最小。

### A.3 綁定與登入流程

首次使用（尚未綁定）：

```
LINE 圖文選單點入 /member
   │
   ▼
liff.init() → liff.isLoggedIn()?
   │ 否 → liff.login()（LINE 內建，自動跳轉回來，非本專案程式碼要處理)
   ▼ 是
liff.getIDToken() 拿到 idToken
   │
   ▼
POST /api/member/liff-bind { idToken }
   │
   ▼ 後端：向 LINE 驗證 idToken（見 A.4），拿到 line_user_id（sub）
   │
   ▼ profiles.line_user_id = sub 查得到嗎？
   │ 查不到（真的第一次）
   ▼
回應「請完成手機驗證以綁定會員資料」
   │
   ▼
沿用既有 /api/book/send-otp、/api/book/verify-otp（完全不改，同一套
OTP challenge/session 機制）——客人輸入手機號碼收簡訊驗證碼
   │
   ▼ 驗證碼正確，拿到已驗證的 phone
   ▼
POST /api/member/liff-complete-bind { idToken, phone }
   │  後端重新驗證 idToken（不信任任何客戶端存的中間狀態）＋重新驗證
   │  book_session（沿用 verifyBookingSession，證明這支手機真的完成
   │  過 OTP，不是繞過 OTP 直接呼叫這支 API）
   ▼
customers 裡有沒有這支 phone？
   │ 有（門市留過資料的老客人）→ 沿用該 customers.id，新建
   │       profiles(role='customer', line_user_id=sub, phone=phone)，
   │       customers.profile_id = 新 profile.id 。老客人的預約/儲值/
   │       服務紀錄歷史全部原樣接上，只是多了一個 LINE 身分。
   │ 沒有（真的新客人）→ 新建 customers + profiles 兩列，
   │       跟 findOrCreateCustomer() 邏輯相同但多寫 profiles，抽成
   │       共用函式 findOrCreateCustomerForMember()。
   ▼
簽發 member_session cookie（見 A.5），導向 /member 首頁
```

之後每次使用（已綁定）：

```
liff.getIDToken() → POST /api/member/liff-bind { idToken }
   │
   ▼ 後端驗證 idToken 拿到 sub，profiles.line_user_id = sub 查得到
   ▼
直接簽發 member_session cookie，免 OTP，導向 /member 首頁
```

`/api/member/liff-bind` 這支 API 同時扮演「首次檢查」跟「之後每次
登入」兩種情況的入口，靠「查不查得到 profiles 列」分岔，不是兩支
不同 API——這樣前端邏輯簡單：永遠先打這支，依回應決定要不要多問
一次手機號碼。

### A.4 idToken 驗證方式：呼叫 LINE 官方 verify endpoint，不要自己驗簽

```
POST https://api.line.me/oauth2/v2.1/verify
Content-Type: application/x-www-form-urlencoded
id_token={idToken}&client_id={LINE_CHANNEL_ID}
```

回應包含 `sub`（就是 `line_user_id`）、`name`、`picture`、`exp`——伺服器
只要檢查 HTTP 200 且 `aud`／回應本身等於我們的 channel id 即可信任
`sub`。**這是 D.2「不信前端自稱的 line_user_id」的具體做法**：前端
只送 `idToken`（一個短效、簽過名、客戶端無法偽造的字串），後端永遠
自己去問 LINE「這個 token 解出來的 userId 是誰」，不接受任何請求
body 裡客戶端自己填的 `line_user_id` 欄位。

沒有選擇「本地用 LINE 的 JWKS 驗證 JWT 簽章」這個更快（省一次網路
往返）的做法，是因為：(1) 本專案至今沒有任何 JWT 驗簽/JWKS 快取的
基礎設施，(2) 綁定/登入不是高頻操作（一天可能幾十次，不是每個
API 都要驗），換一次網路往返的延遲換取「完全不用自己維護 JWKS
快取更新邏輯」——跟 ECPay 走 `verifyCheckMacValue` 純本地運算的取捨
不同，是因為 ECPay 沒有官方「幫你驗」的 endpoint，LINE 有。

### A.5 `member_session`：延續現有 signedToken 機制，不新開一套

```ts
// src/lib/booking/otpSession.ts 新增一種 payload kind
type MemberSessionPayload = {
  kind: "member_session";
  customerId: string;
  lineUserId: string;
  expiresAt: number;
};
```

沿用同一個 `BOOKING_TOKEN_SECRET`、同一支 `signToken`/`verifyToken`，
新增 `createMemberSession()`/`verifyMemberSession()`，風格完全比照
`createBookingSession`/`verifyBookingSession`。Cookie 名稱
`member_session`，`httpOnly`／`secure`／`sameSite: lax` 比照
`book_session`，TTL 建議 **7 天**（比 `book_session` 的 20 分鐘長
很多，因為 `/member` 是重複造訪的場景，不是一次性結帳流程；7 天後
`liff.getIDToken()` 會自動重新拿新的，`/api/member/liff-bind` 重新
驗一次直接無感續期，客人不會感覺到任何登出）。

### A.6 `/member` 內容（三個分頁，比照 `/admin/members/[id]` 的分頁風格）

```
┌─────────────────────────────────────┐
│ 陳小姐，您好                          │
│ 儲值餘額 NT$8,450  ← 有餘額才顯示，比照 │
│                     Phase 5 會員詳情頁 │
├─────────────────────────────────────┤
│ [我的預約] [儲值] [個人資料]            │
├─────────────────────────────────────┤
│ 我的預約（分頁一，預設）                │
│  ● 2026/07/15（三）14:00 陳師傅        │
│     熱石油壓 90 分鐘                   │
│     [取消預約]  ← 見 A.7 取消規則      │
│  ● 2026/07/20（一）10:30 林師傅        │
│     肩頸放鬆 60 分鐘・尚需付訂金        │
│     [前往付款] [取消預約]              │
│  ─ 歷史紀錄（已完成/已取消）─          │
│     2026/06/28 已完成                  │
└─────────────────────────────────────┘
```

「儲值」分頁：餘額卡（本金/贈額拆開顯示）+ 交易明細，**唯讀**——不
提供退費（退費維持 owner 限定後台操作，客人不能自助退費，這是 Phase
5 既定規則，本輪不變更）。

「個人資料」分頁：姓名、生日、email 可編輯；手機號碼**不可**自助
修改（手機是綁定/OTP 驗證的錨點，改手機等同換身分，若客人真要改
手機，走「解除綁定重新走一次 OTP 流程」或請店家後台改，本輪不做
「改手機」這個功能，只做顯示）。

### A.7 客人自助取消：沿用「1 小時爽約線」

> **這裡我的理解需要你確認**：目前程式碼裡沒有任何地方已經實作過
> 「1 小時」這個時間門檻（我搜過 `appointmentActions.ts`／
> `depositPolicy.ts`／全部 docs，都沒有），所以我把它讀成**這輪要
> 新定義**的規則，不是「沿用既有程式碼」。我的理解：**預約開始
> 前不到 1 小時，客人在 `/member` 就看不到「取消預約」按鈕**（畫面
> 上改顯示「請直接聯繫店家」+ 電話），超過門檻則正常顯示可取消。
> 如果你指的是別的東西（例如「爽約」判定本身的某個既有時間邏輯），
> 麻煩點出來，我用錯的话這條全部要重寫。

若上述理解正確，實作是一個新的純函式：

```ts
// src/lib/booking/customerCancelPolicy.ts
export const CUSTOMER_CANCEL_CUTOFF_MINUTES = 60;

export function canCustomerCancelAppointment(
  status: string,
  startAt: Date,
  now: Date = new Date()
): boolean {
  if (!["confirmed", "pending_deposit"].includes(status)) return false;
  return startAt.getTime() - now.getTime() > CUSTOMER_CANCEL_CUTOFF_MINUTES * 60 * 1000;
}
```

取消動作重用既有 `appointments.status → 'cancelled'` 的資料流（跟
admin cancel 共用底層 SQL 動作），但 `cancel_reason` 寫
`'customer_cancelled'`（區分是店家取消還是客人自己取消，跟 Phase 4
的 `void_reversal` vs `refund` 分開語意是同一個道理），且需要一支
新的 API `/api/member/appointments/[id]/cancel`，**權限檢查**：
`appointments.customer_id` 必須等於 `member_session.customerId`
（不能靠猜 URL 取消別人的預約），加上 `canCustomerCancelAppointment`
擋門檻。已付訂金的預約被取消時，訂金處理沿用既有 admin cancel 的
邏輯（訂金維持 `paid`，之後要不要退款走既有 Phase 3-3 的
`markDepositRefunded`，owner 手動處理，客人自助取消**不**自動退訂金
——避免自助流程被拿來刷退款）。

---

## B. Messaging API 自動通知

### B.1 訊息設計：Flex Message

四種通知（預約成功、前一日提醒、隔日回訪關懷、訂金付款/逾期）都用
Flex Message（卡片式，能放品牌配色的色塊、按鈕），不是純文字——
`docs` 裡品牌色系（米白/陶土/植物綠/金）直接套進 Flex bubble 的
`backgroundColor`／按鈕顏色。純文字訊息只用在系統錯誤或極簡通知
（本輪目前想不到需要純文字的情境，但 `message_templates.channel`
設計成同時支援 `line_flex`/`line_text` 兩種，留擴充空間）。

### B.2 範本管理：`message_templates` 表 + 後台編輯頁

```sql
CREATE TABLE public.message_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  -- 'booking_confirmed' / 'reminder_day_before' /
  -- 'revisit_care' / 'deposit_payment_link' / 'deposit_expiring_soon'
  name         text NOT NULL,           -- 後台顯示用中文名稱
  channel      text NOT NULL DEFAULT 'line_flex' CHECK (channel IN ('line_flex','line_text')),
  content      jsonb NOT NULL,
  -- line_text: {"text": "您好 {{name}}，..."}
  -- line_flex: 完整 Flex Message JSON，文字欄位裡允許 {{var}} 佔位符
  is_active    boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
```

變數代換是**遞迴走過 `content` jsonb 裡所有字串值**，把
`{{name}}`／`{{date}}`／`{{staffName}}`／`{{serviceName}}`／
`{{depositLink}}` 等替換掉——純函式 `renderTemplate(content: unknown,
vars: Record<string,string>): unknown`，跟 flex JSON 結構完全解耦，
所以以後範本改版（換版型、換色塊）不需要動程式碼，後台編輯 JSON
就好。**後台範本編輯頁面**（owner 限定）提供的不是自由 JSON 編輯器
（風險太高，一個打錯的 JSON 會讓整支訊息發送失敗），而是「文字欄位
+ 變數選單」的表單，背後組成固定版型的 Flex JSON——每種 `key` 對應
一個固定 layout（例如 `booking_confirmed` 固定是「標題列 + 日期/
師傅/項目三行 + 店址 + 注意事項」），owner 只能改文字內容跟要不要
顯示某一行，不能改版型結構。這樣「支援 {{name}} {{date}} 等變數」
的需求被滿足，但不會因為 owner 手滑打壞 JSON 導致整個通知系統掛掉。

### B.3 `notifications_log`

```sql
CREATE TABLE public.notifications_log (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  template_key            text NOT NULL,
  related_appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status                  text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error_message           text,
  triggered_by            text NOT NULL CHECK (triggered_by IN ('system_cron','system_event','admin_manual')),
  operator_id             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  line_message_id         text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- 冪等防重複發送的關鍵：同一筆預約、同一種範本，成功發送過就不能再發
CREATE UNIQUE INDEX idx_notifications_log_dedupe
  ON public.notifications_log (related_appointment_id, template_key)
  WHERE status = 'sent' AND related_appointment_id IS NOT NULL;
```

排程掃描（B.5）每次執行前**必須**先查這張表確認沒發過，寫入用
`ON CONFLICT DO NOTHING` 搭配上面的 partial unique index——這是排程
「今天沒發完、明天重跑」或「同一分鐘被觸發兩次」都不會重複騷擾客人
的唯一保險，比「用時間區間篩選『今天有沒有發過』」可靠，因為時間
區間篩選在時區/測試環境下容易出錯，直接查有沒有這筆 `(appointment_id,
template_key)` 的成功紀錄最不會出錯。

### B.4 四種通知各自的觸發條件與收件時機

| 範本 key | 觸發條件 | 何時查/發 |
|---|---|---|
| `booking_confirmed` | 建立成功的預約（`create-appointment` API 成功回應後）| **即時**，不進排程，API 成功後直接呼叫發送（`system_event`）|
| `deposit_payment_link` | 建立時判定 `requiresDeposit=true` 的預約 | 跟 `booking_confirmed` 同一次即時發送，同一則或緊接第二則 Flex（含 ECPay 付款連結）|
| `deposit_expiring_soon` | `pending_deposit` 且 `expires_at` 即將到期（例如剩 10 分鐘內）| 排程掃描，每 5～10 分鐘跑一次 |
| `reminder_day_before` | `status IN ('confirmed')`，`appointment_date = 明天` | 排程，**每天 20:00** 跑一次（對應 CLAUDE.md 業務規則 3）|
| `revisit_care` | `status = 'completed'`，`appointment_date = 昨天` | 排程，每天固定時間跑一次（建議也訂 20:00 或早上，兩者可以是同一支 cron route 依序執行，不用分兩支）|

`deposit_expiring_soon` 觸發後如果最終真的到期沒付款——**這是既有
「上線前基礎設施」待辦裡的 lazy-expire 排程**（`design-log.md` 2026-
07-10 條目提到的四項之一），目前只有「寫入前被動檢查」沒有背景清理。
**建議**：Phase 6 既然本來就要建 Vercel Cron 基礎設施，順手把
lazy-expire 掃描實作也放進同一支排程路由裡一起做掉，關掉這個已經
掛了好幾個 phase 的待辦——但這是新增範圍，不在你這次列的 A/B/C/D
需求裡，**需要你明確同意**才會排進本輪，不然我按你原始需求範圍走，
`deposit_expiring_soon` 只負責「發提醒」，不負責「真的釋放時段」。

### B.5 排程機制：Vercel Cron（正式環境）+ 本機模擬方案

正式環境：`vercel.json` 新增

```json
{
  "crons": [
    { "path": "/api/cron/notifications", "schedule": "0 12 * * *" },
    { "path": "/api/cron/deposit-expiry-sweep", "schedule": "*/10 * * * *" }
  ]
}
```

（Vercel Cron 的 schedule 是 UTC，`0 12 * * *` = 台灣時間每天 20:00；
`reminder_day_before` 跟 `revisit_care` 排進同一支 `/api/cron/
notifications` route，內部依序各跑一次，不用開兩支路由。）

路由本身用 `CRON_SECRET` 保護（業界標準做法，Vercel 官方文件也是
這樣建議）：

```ts
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ...跑排程邏輯
}
```

**本機開發模擬方案**：Vercel Cron 只在部署環境（production/preview）
才會真的觸發，本機 `next dev` 完全不會跑。因為排程邏輯本身被設計成
一支「帶 `now: Date` 參數的純函式 + 一支薄薄的 route handler」（跟
現有 `buildAppointmentUpdate(action, now)` 同一種可測試風格），本機
驗證分兩層：

1. **單元測試層**（主要驗證手段）：`notificationSweep.test.ts` 直接
   呼叫 `findDueReminders(appointments, now)` 這類純函式，餵固定的
   `now` 跟假資料，不牽扯真的排程觸發，跟現有 172→184 案的測試風格
   完全一致。
2. **手動觸發層**（驗收/整合測試用）：本機執行期間，直接
   `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications`
   手動打一次，跟 Phase 3～5 驗收時「造測試資料→手動驗證」的既有
   節奏一致，不需要額外工具。

**不建議**引入本機排程套件（例如 `node-cron`、額外開一個常駐 Node
process）——這個專案是純 Next.js route handler 架構，沒有背景常駐
process 的先例（ECPay webhook、admin 操作都是 request-response 模式），
引入常駐排程器等於多一種要維運的東西，且正式環境根本用不到（Vercel
Cron 才是實際跑的機制），本機用 curl 手動觸發 + 單元測試覆蓋邏輯，
性價比更高。

### B.6 發送服務架構

```
src/lib/line/
  lineClient.ts       — 手刻的 fetch 包裝：pushMessage(to, messages)、
                         replyMessage(replyToken, messages)、
                         verifyIdToken(idToken)
  webhookSignature.ts — x-line-signature 驗證（見 D.1）
  templateRender.ts   — renderTemplate(content, vars) 純函式
  notificationSender.ts
                       — sendNotification({ customerId, templateKey,
                         vars, relatedAppointmentId, triggeredBy,
                         operatorId? })：查 profiles.line_user_id、
                         查 message_templates、renderTemplate、呼叫
                         pushMessage、寫 notifications_log（成功/
                         失敗都寫，失敗不拋錯中斷排程其他筆的處理）
  notificationSweep.ts
                       — findDueDayBeforeReminders / findDueRevisitCare
                         / findDueDepositExpiring：純函式，輸入資料
                         +now，輸出「該發給誰、哪個範本、哪個
                         appointment」的清單，不含任何 IO
```

若 `customers.profile_id` 是 NULL（客人根本沒綁 LINE）——
`sendNotification` 直接寫一筆 `status='skipped'`（不是 `failed`，
語意上這不是錯誤，是「這個客人沒有可通知的管道」），不重試、不
報錯,排程繼續處理下一筆。

---

## C. 後台整合

### C.1 LINE 綁定狀態顯示

會員列表（`MemberListView`）新增一欄「LINE」：綁定顯示綠色勾勾圖示，
未綁定顯示灰色。會員詳情頁頭部（比照 Phase 5 儲值餘額摘要那一行的
位置）加一行「LINE 已綁定」或「尚未綁定」。資料來源：`customers
LEFT JOIN profiles ON profiles.id = customers.profile_id`，`profiles.
line_user_id IS NOT NULL` 才算已綁定。

### C.2 手動單發

會員詳情頁新增「發送 LINE 訊息」按鈕（僅已綁定客人顯示），彈窗選
`message_templates` 裡 `is_active=true` 的範本 + 預覽渲染後內容
（用該客人的真實姓名/最近一筆預約資料代入變數），確認後呼叫同一支
`sendNotification()`，`triggeredBy: 'admin_manual'`、`operatorId` 記錄
是誰按的。manager/owner 都能用（不是 owner 限定——單發一則訊息不是
高風險操作，跟退費、改抽成率不同級別）。

### C.3 群發引擎——本輪不做，掛帳

明確排除在本輪範圍外，記錄進 `design-log.md` 待辦。技術上將來要做
時，是 Phase 3 會員列表既有的篩選條件（標籤/爽約/儲值餘額等）直接
接一個「對篩選結果批次呼叫 `sendNotification`」的按鈕，架構上不需要
額外設計，現在先不花時間做。

---

## D. 安全

### D.1 Webhook 簽章驗證

```ts
// src/lib/line/webhookSignature.ts
import { createHmac, timingSafeEqual } from "crypto";

export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string | null,
  channelSecret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
```

跟 `signedToken.ts` 的 `verifyToken` 用一樣的 constant-time 比較風格。
**關鍵**：route handler 必須用 `await request.text()` 拿原始 body
字串去算簽章，**不能先 `request.json()`** ——JSON.parse 再
JSON.stringify 回去不保證 byte-for-byte 相同（欄位順序、空白都可能
變），簽章會對不上。驗證通過後才 `JSON.parse(rawBody)`。

Webhook 本輪要處理的事件類型：`follow`（客人加好友——可選擇性寫
`profiles.is_active = true` 或單純記錄）、`unfollow`（客人封鎖官方
帳號——**必須處理**，這種情況之後 push 訊息一定會被 LINE API 拒絕，
應該記一個 `profiles` 標記或直接把後續 `sendNotification` 對這個人
的呼叫改成 `skipped`，避免每次都打一次注定失敗的 API 且污染
`notifications_log` 的 `failed` 紀錄）。`message` 事件（客人主動傳
訊息給官方帳號）本輪**不做自動回覆邏輯**，webhook 收到後直接回
200（LINE 要求即使不處理也要在時限內回應），不觸發任何動作——避免
範圍蔓延到「客服機器人」這個完全不同量級的功能。

### D.2 LIFF idToken 後端驗證

已在 A.4 說明：一律呼叫 LINE 官方 `/oauth2/v2.1/verify`，後端自己拿
`sub` 當唯一真實的 `line_user_id`，任何 API 都不接受請求 body 裡
客戶端自稱的 `line_user_id`／`customerId` 欄位——`/member` 底下所有
需要「這是不是本人」的操作（查自己的預約、取消自己的預約、改自己
的資料），一律從 `member_session` cookie 解出 `customerId`，不從
請求參數拿。

---

## E. 環境變數清單 + LINE Developers Console 設定步驟

### E.1 環境變數（你自己填 `.env.local`，不進對話）

| 變數 | 用途 | 從哪拿 |
|---|---|---|
| `LINE_CHANNEL_ID` | idToken 驗證的 `client_id`；Messaging API 頻道識別 | Console → Messaging API 頻道 → 基本設定 → Channel ID |
| `LINE_CHANNEL_SECRET` | Webhook 簽章驗證 | 同上頁面 → Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | 呼叫 push/reply Messaging API 用 | 同上頁面 → Messaging API → Channel access token（長期），按「Issue」產生 |
| `NEXT_PUBLIC_LIFF_ID` | 前端初始化 LIFF SDK 用（client-side，會進 bundle，不是密鑰） | Console → 同一個頻道 → LIFF 分頁 → 新增 app 後拿到的 LIFF ID |
| `CRON_SECRET` | 保護 `/api/cron/*` 路由不被外部直接打 | 自己產生一組隨機字串即可（例如 `openssl rand -hex 32`），不是 LINE 給的 |

### E.2 LINE Developers Console 設定步驟

1. 若還沒有 Provider，先建一個（例如「溫罐子」）。
2. 在該 Provider 底下新增 **Messaging API** 頻道（不是 LINE Login
   頻道）——填基本資料、上傳 OA 頭像/背景（品牌色系）。
3. 進頻道的「Messaging API」分頁：
   - 開啟 **Use webhook**。
   - Webhook URL 先留空或填 placeholder，等 Phase 6 部署後回來填
     `https://{正式網域}/api/line/webhook`，填完按 **Verify** 確認
     回 200。
   - **關閉** Auto-reply messages（自動回覆，避免跟我們自己的邏輯
     衝突）、**關閉** Greeting messages（或自訂成品牌語氣，非必要）。
   - 產生 **Channel access token（長期）**，填進
     `LINE_CHANNEL_ACCESS_TOKEN`。
4. 進「基本設定」分頁，複製 **Channel ID** 跟 **Channel secret**。
5. 進「LIFF」分頁，**新增 LIFF app**（重申 A.0：一定要在這個
   Messaging API 頻道底下新增，不要另外建 LINE Login 頻道）：
   - Endpoint URL：`https://{正式網域}/`（本機開發期間 LIFF 內建瀏覽器
     連不到 `localhost`，本機測試 LIFF 相關功能需要用 ngrok 之類的
     工具開臨時網址，或先用瀏覽器直接開 `/member` 略過 LIFF 走
     OTP-only 路徑測試邏輯，LIFF SDK 本身在非 LINE 環境會
     `liff.isInClient()===false`，程式要能優雅降級成純 OTP 流程）。
   - Size：Full。
   - Scope：勾選 `profile`、`openid`（`email` 不需要）。
   - **Add friend option**：開（On, aggressive）——客人開 LIFF 時若
     還沒加好友會被提示加好友，push 訊息才發得到。
   - 建立後複製 **LIFF ID**，填進 `NEXT_PUBLIC_LIFF_ID`。
6. （可選，A.1 提到的圖文選單）進「LINE Official Account Manager」
   （不是 Developers Console，是官方帳號後台
   manager.line.biz）建圖文選單，按鈕連結分別指向
   `https://liff.line.me/{LIFF_ID}/book` 與
   `https://liff.line.me/{LIFF_ID}/member`。這步驟純 UI 操作，不需要
   我這邊寫程式，你可以自己在後台編輯器完成，或等程式碼都上線後我再
   協助設計選單版面。
7. 拿你自己的 LINE 帳號加官方帳號好友，作為驗收測試用的客人身分。

---

## F. Migration 清單（本輪待實作，先列出不動工）

```sql
-- message_templates、notifications_log 兩張新表（見 B.2、B.3 完整定義）
-- profiles / customers 完全不用改欄位，Phase 1 已經預留好
```

不需要動 `customers`／`profiles`／`appointments` 既有欄位，`cancel_reason`
是自由文字欄位（沒有 CHECK 約束），`'customer_cancelled'` 這個新值
直接寫得進去不需要 migration。

---

## G. 新增依賴

`package.json` 新增一個套件：`@line/liff`（LIFF 前端 SDK，client-side
only）。Messaging API／Webhook／idToken 驗證維持零依賴、手刻 fetch，
跟 ECPay 那一套風格一致。

---

## H. 待你確認的點（整理成清單方便直接回覆）

1. **A.7 的「1 小時爽約線」解讀**是否正確？（預約開始前不到 1 小時，
   `/member` 隱藏取消按鈕）如果是別的意思麻煩說明。
2. **B.4 的 lazy-expire 順手處理**：要不要趁這輪 Vercel Cron 基礎設施
   一起把「上線前基礎設施」待辦裡的 lazy-expire 排程做掉？（不做的話
   `deposit_expiring_soon` 只發提醒不釋放時段，這個待辦繼續掛著等
   之後的「上線前基礎設施」phase）
3. **C.2 手動單發權限**：草案定為 manager+owner 皆可（不是 owner 限定），
   跟退費/改抽成率這類高風險操作分開。若你認為單發訊息也該 owner
   限定，我改。
4. **`revisit_care` 與 `reminder_day_before` 的確切發送時間**：草案抓
   兩者都在 20:00 跑（同一支 cron route 內依序執行），沒有你原始需求
   裡對 `revisit_care` 指定確切時間，若你有偏好時段（例如隔日回訪想
   在早上發，不要跟提醒擠同一時間）請告訴我。

其餘（Flex Message 實際版型/文案、圖文選單版面）我先不在草案裡畫
死，等骨架確認後再交一版 Flex JSON 給你看實際渲染效果——你先前也
說了「隔日回訪文案我會親自審」，這塊等技術骨架定案後再另外對文案。
