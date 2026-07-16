# Phase 7-A Wave 0：你的操作逐步清單

> 對應 [phase-7a-early-launch-draft.md](phase-7a-early-launch-draft.md) §9
> Wave 0。這是給你照單操作用的逐步清單，跟 code 端的 Wave 1/2/3 平行
> 進行。每一步都附「怎麼驗證這步真的做對了」，不是做完就跳下一步，先
> confirm 驗證通過再往下。編號依內部依賴順序排列，**W0-3 可以跟其他任何
> 步驟同時做（純 git 操作，無依賴）**，其餘大致依編號順序較順。

---

## W0-1：建立 Supabase organization + 專案

**操作**：
1. 登入 Supabase 後台，建立新 organization，命名 **Warmjar-Booking**。
2. 該 organization 底下建立新專案，命名 **`warmjar-booking-prod`**，方案選
   **Free**。
3. 記下這個專案的 Region（建議跟 `warmjar-dev` 同區域，降低延遲，非必要
   但建議）。

**驗證**：Supabase 後台能看到 `warmjar-booking-prod` 專案，狀態顯示
「Active」（專案剛建立需要 1-2 分鐘初始化）。進 Project Settings →
Database，能看到 Connection string（`DATABASE_URL`）、Project Settings →
API 能看到 `Project URL`（`NEXT_PUBLIC_SUPABASE_URL`）跟兩把 API key
（`anon` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`，`service_role` →
`SUPABASE_SERVICE_ROLE_KEY`）。這四個值先抄下來（存在你自己的密碼管理
工具，不要傳給我），W0-5 會用到。

**若這步被平台拒絕**：見設計文件 §1.1 fallback——回頭在既有 organization
底下升級 Pro、開新專案，這條路徑我們屆時再另外討論，不要自己嘗試繞過。

---

## W0-2a：對 `warmjar-booking-prod` 執行既有 10 支 migration

**依賴**：W0-1 完成。

**操作**：這步等我告知「Wave 1 的 migration 檔已就緒」再開始比較保險
（避免你先跑完 10 支、我這邊還在準備第 11 支時兩邊對不齊）——但其實
這 10 支既有檔案早就在 repo 裡（`supabase/migrations/` 目錄，
`20260707000001` 到 `20260714000010` 十個檔案），跟這輪 Wave 1 工作
無關，**你現在就可以開始，不用等我**。

依檔名順序（`20260707000001` 開頭最先），把每個檔案內容貼到 Supabase
後台 → SQL Editor，逐一執行。**順序不能亂**，後面的 migration 依賴前面
建好的表，錯了順序會直接報錯（報錯就是訊號，代表順序錯了或漏執行前一支，
不要跳過錯誤繼續往下）。

**驗證**：全部執行完後，SQL Editor 跑一次：
```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
```
應該看到 `appointments`、`customers`、`profiles`、`checkouts`、
`stored_value_accounts`、`message_templates`、`notifications_log` 等表都在
（完整清單可以對照 `supabase/schema-draft.md`）。再跑：
```sql
select count(*) from message_templates;  -- 應為 5
select count(*) from stored_value_plans; -- 應為 3
```

---

## W0-2b：執行第 11 支 migration（system_settings 開關）

**依賴**：W0-2a 完成 + 我這邊 Wave 1 的 migration 檔已寫好並在
`warmjar-dev` 驗證過（我會在 Wave 1 完成報告裡明確告知檔名跟內容，你
到時候直接去 `supabase/migrations/` 目錄找那個檔案，跟 W0-2a 一樣的
方式貼到 SQL Editor 執行）。

**驗證**：
```sql
select key, value from system_settings where key in ('deposit_flow_enabled','push_enabled');
```
應該看到 `deposit_flow_enabled` = `false`、`push_enabled` = `true`。

---

## W0-3：切 `release/booking-prod` 分支（可隨時做，無依賴）

**操作**：從 `feature/booking-system`（或這輪工作完成後的最終合併點，
你可以先從目前的 `feature/booking-system` 切）切出長期分支
`release/booking-prod`。這步你可以自己用 git 指令做，或請我代為執行——
如果要我代做，跟我說一聲即可，這是單純的 git 操作，不涉及任何金鑰或
破壞性動作。

**驗證**：`git branch -a` 能看到 `release/booking-prod` 存在。

---

## W0-4：新建 Vercel Project + 網域

**依賴**：W0-3（需要有分支可以指定為 Production Branch）。

**操作**：
1. Vercel 後台 → New Project → 選同一個 GitHub repo（`warmjar-site`）。
2. **重要**：Import 時或建立後，把這個新 Project 的 **Production Branch**
   設定改成 `release/booking-prod`（不是預設的 `main`——預設值務必手動
   改掉，這是硬約束「main 分支與正式官網不可動」能不能守住的關鍵一步，
   建好後務必回頭再檢查一次這個設定）。
3. Project → Settings → Domains，新增 `book.warmjar.com.tw`，依 Vercel
   給的指示到你的 DNS 服務商（網域註冊商或 DNS 代管商）新增對應的 CNAME
   /A 記錄。

**驗證**：Vercel 後台該 Project 的 Domains 頁面顯示 `book.warmjar.com.tw`
狀態為「Valid Configuration」（打勾，不是警告圖示）。DNS 生效可能需要
幾分鐘到數小時（視你的 DNS 服務商 TTL 設定），生效後瀏覽器開
`https://book.warmjar.com.tw` 應該能連到（此時因為還沒填環境變數，
頁面可能會報錯，那是預期中的，先確認「連得到」，不是確認「能正常運作」）。

---

## W0-5：填正式環境變數

**依賴**：W0-1（要有 Supabase 的 URL/keys）、W0-4（要有 Vercel Project）。

**操作**：Vercel 後台 → 新 Project → Settings → Environment Variables，
逐項填入 [phase-7a-early-launch-draft.md §3.2](phase-7a-early-launch-draft.md)
表格列出的每一個變數，環境選 **Production**（不要選到 Preview 或
Development，那兩個沿用 `warmjar-dev`，不要在這裡填正式值）。特別注意：

- `BOOKING_TOKEN_SECRET`、`CRON_SECRET`：**自己產生新的隨機字串**（例如
  `openssl rand -hex 32`，或任何你熟悉的隨機字串產生方式），**不要**複製
  `.env.local` 裡 dev 用的值。
- `NEXT_PUBLIC_SITE_URL`：`https://book.warmjar.com.tw`
- `LINE_CHANNEL_ACCESS_TOKEN`：建議留空（見設計文件 §3.2 說明）。
- `ADMIN_EMAILS`：真實員工信箱清單（見 W0-9）。
- `ECPAY_ENV`／`ECPAY_MERCHANT_ID`／`ECPAY_HASH_KEY`／`ECPAY_HASH_IV`：
  維持 `staging` + 官方測試環境金鑰即可，不需要正式金鑰（§4.2 已定案）。

**驗證**：Vercel 後台 Environment Variables 頁面逐項核對清單打勾，
確認沒有漏填、沒有 Environment 選錯。這步沒有「跑一下看結果」的驗證
方式，純粹逐項核對，建議填完後截圖存底（不含金鑰明文那頁，或截圖後
自己保管，不要傳給我）。

---

## W0-6：GitHub repository secret

**依賴**：W0-5（要先知道 `CRON_SECRET` 填了什麼值）。

**操作**：GitHub repo → Settings → Secrets and variables → Actions →
New repository secret → Name 填 `CRON_SECRET`，Value 貼上跟 W0-5 完全
相同的那組值。

**驗證**：GitHub repo → Settings → Secrets and variables → Actions 頁面
能看到 `CRON_SECRET` 列在清單裡（GitHub 不會顯示值本身，看到名稱列出來
就是設定成功）。真正驗證「值填對了」要等 Wave 3 的 `workflow_dispatch`
手動觸發測試（F-3），這步先確認「有設定」即可。

---

## W0-7：LINE Console 改 LIFF Endpoint URL

**依賴**：**建議**在 W0-4 的網域確認可連通（DNS 生效）之後再做，見設計
文件 §2.2「操作順序建議」——避免切過去之後有一段時間客人打開 LIFF 連不到
任何東西。

**操作**：LINE Developers Console → Provider（溫罐子，2002675868）→
`warmjar-booking`（自建 LINE Login channel）→ LIFF 分頁 → 找到自建的
LIFF app → 編輯 → Endpoint URL 改成 `https://book.warmjar.com.tw/`。

**⚠️ 逐字核對你正在編輯的是哪個 channel**：務必確認左側/頂部顯示的
channel 名稱是 **`warmjar-booking`**（我方自建），不是夯客既有的
「溫罐子」LINE Login channel（那支是禁碰項，唯讀）。改錯 channel 是這步
唯一真正的風險，操作前後都建議截圖核對 channel 名稱。

**驗證**：改完後，用你自己的手機 LINE 掃自建 LIFF 的連結（或走既有的
Rich Menu／深連結入口），確認能正常開啟 `book.warmjar.com.tw` 底下的
`/member` 頁面（此時因為 Wave 2/3 的綁定功能可能還沒完全上線，能打開
頁面本身、不是白屏或連線錯誤，就算這步驗證通過）。

---

## W0-8：`/admin` 輸入真實師傅與服務資料

**依賴**：W0-2a（schema 要先建好）。**建議**在 W0-5 環境變數填完、能
成功登入 `/admin` 之後才做（否則你會連不進後台）。

**操作**：用真實員工帳號登入 `https://book.warmjar.com.tw/admin`，依
你店裡實際的師傅名單、服務項目與價目表逐一建立（**不要**照抄
`supabase/seed.sql` 裡的示範資料，那是「陳師傅」「林師傅」兩位假名跟
兩項佔位服務，不是真實資料）。

**驗證**：`/admin` 的師傅列表、服務列表畫面顯示的是你店裡真實的名字跟
價格，不是示範資料。

---

## W0-9：決定 `ADMIN_EMAILS` 名單

**依賴**：無，可隨時做。

**操作**：列出這輪需要用 `/admin` 的真實員工信箱清單，填進 W0-5 的
`ADMIN_EMAILS` 環境變數（逗號分隔，格式比照 `.env.local` 裡 dev 那份
的既有格式）。

**驗證**：用清單裡每一個信箱各自登入一次 `/admin`，確認都能成功
（不在清單裡的信箱登入應該被拒絕，可以挑一個不在清單裡的信箱測一次
確認真的被擋，順便驗證白名單機制本身有生效）。

---

## 完成 Wave 0 後

跟我說一聲「Wave 0 完成」，我會依 §9 F-2／F-3／F-4 這幾項需要 Wave 0
成果才能執行的收尾工單接著跑（例如 `vercel.json` 部署後的實際觸發驗證、
GitHub Actions `workflow_dispatch` 手動測試）。你不用等到 Wave 0
「全部」完成才通知我——如果某幾步先卡住（例如 DNS 生效比預期慢），
其他已經完成的步驟我這邊還是可以先根據需要對應動作，跟我說目前卡在
哪一步即可。
