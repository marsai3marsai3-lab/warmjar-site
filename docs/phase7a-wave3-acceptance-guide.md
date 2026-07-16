# Phase 7-A Wave 3 正式驗收劇本（逐步實測）

> 對應：[phase-7a-early-launch-draft.md](phase-7a-early-launch-draft.md) §9
> Wave 3（F-1 ～ F-5，含 F-3b）。比照
> [phase6-stage6a1-acceptance-guide.md](phase6-stage6a1-acceptance-guide.md)
> 的逐按鈕實測格式。狀態：**待執行**。
>
> 本劇本涵蓋兩類驗收：**功能驗證**（零～四區，用測試資料，在
> `warmjar-booking-prod` 上跑但不涉及真實客人）跟**真實客人上線驗證**
> （五區，需要真的有第一位客人配合，是整份劇本最後才做的一步）。
> 前四區任何一區沒過，都不該往下走到五區。

---

## 零、前置條件（缺一不可開始）

- [ ] Wave 0（[phase7a-wave0-owner-runbook.md](phase7a-wave0-owner-runbook.md)）
      九個工單皆完成，`book.warmjar.com.tw` 能正常連通並成功登入 `/admin`
- [ ] Wave 1、Wave 2 的程式碼已合併進 `release/booking-prod` 分支並部署
      成功（Vercel 該 Project 的 Production 部署顯示綠燈）
- [ ] `warmjar-booking-prod` 已執行完 10 支既有 migration ＋ Wave 1 新增
      的第 11 支（`20260722000011_phase_7a_operational_flags.sql`）
- [ ] 正式環境變數（§3.2）已全數填妥，`CRON_SECRET` 與 GitHub
      repository secret 的值一致
- [ ] 測試工具：兩支**不同**LINE 帳號的測試手機（二區 race-safe 測項
      需要兩支帳號才能真的走出衝突分支，缺一支就只能測到「第一次成功」，
      測不到「第二次衝突」）、`/admin` 真實員工帳號、`warmjar-booking-prod`
      Supabase 後台 SQL Editor 存取權限（驗證查詢用）
- [ ] 建一位測試會員（真實姓名/假名皆可，但**不要用真實客人資料**，
      這區全部是功能測試，五區才輪到真實客人）

---

## 一、`release/booking-prod` 部署與 cron 驗證（對應 F-2、F-3）

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 1-1 | 確認 `release/booking-prod` 分支的 `vercel.json` 內容 | 為零成本變體排程：`{ "path": "/api/cron/notifications", "schedule": "5 12 * * *" }`、`{ "path": "/api/cron/deposit-sweep", "schedule": "10 12 * * *" }` | | |
| 1-2 | `curl -H "Authorization: Bearer $CRON_SECRET" https://book.warmjar.com.tw/api/cron/notifications` | 回應成功（200） | | |
| 1-3 | 同上但不帶 `Authorization` header | 401 | | |
| 1-4 | `curl -H "Authorization: Bearer $CRON_SECRET" https://book.warmjar.com.tw/api/cron/deposit-sweep` | 回應成功（200） | | |
| 1-5 | GitHub repo → Actions → `LINE 推播排程備援` workflow → `Run workflow`（`workflow_dispatch` 手動觸發） | Run 顯示綠色成功（`curl --fail` 沒有觸發失敗） | | |
| 1-6 | 檢查 1-5 那次 Run 的 log | 能看到打的是 `https://book.warmjar.com.tw/api/cron/notifications`，回應非 4xx/5xx | | |

---

## 二、櫃檯代客綁定完整流程 + race-safe（對應 F-3b）

這是「產生 LINE 綁定連結」這個全新功能第一次真機測試，先測正常流程，
再測衝突分支。

### 2A：正常綁定流程

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 2A-1 | `/admin` 開啟測試會員的詳情頁 | 「LINE：尚未綁定」，顯示「產生 LINE 綁定連結」按鈕（不是「發送 LINE 訊息」） | | |
| 2A-2 | 點擊「產生 LINE 綁定連結」 | 彈出對話框，幾秒內顯示 QR code + 「有效至 HH:MM」（10 分鐘後） | | |
| 2A-3 | 用測試手機 A（LINE 帳號 A）掃描 QR | LINE 內建瀏覽器開啟，跳 LINE 登入/授權畫面（若帳號 A 尚未加溫罐子 OA 好友，會先提示加好友） | | |
| 2A-4 | 帳號 A 同意授權 | 畫面顯示綁定成功，導向 `/member` 首頁 | | |
| 2A-5 | 查 `warmjar-booking-prod` 的 `profiles` 表 | 該測試會員對應的 `profiles.line_user_id` 已寫入帳號 A 的 userId | | |
| 2A-6 | 查 `audit_logs` | 有一筆 `action='admin.member.generate_counter_bind_grant'`，`target_table='customers'`，`target_id` 對應該測試會員 | | |
| 2A-7 | 重新整理 `/admin` 該會員詳情頁 | 「LINE：已綁定」，按鈕變回「發送 LINE 訊息」 | | |

### 2B：race-safe 衝突驗證（F-3b，你裁決排入）

**測項定義**：對同一個 customerId 的綁定，第一次成功後再嘗試綁定
（帶不同的 LINE 帳號），第二次應該被拒絕，不能覆蓋掉第一次的綁定。

用**另一位**測試會員（避免跟 2A 的會員/資料混在一起，方便查驗結果乾淨）：

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 2B-1 | 建第二位測試會員（尚未綁定），在其詳情頁點「產生 LINE 綁定連結」**兩次**（先不要掃描任何一個 QR），各自記下兩組 QR/連結 | 兩次都成功產生，拿到兩組不同的 grant 連結（`generateCounterBindGrant` 只檢查「當下是否已綁定」，同一位未綁定客人可以重複產生多組 grant） | | |
| 2B-2 | 用測試手機 A（帳號 A）掃描**第一組** QR，完成綁定 | 綁定成功（比照 2A-3～2A-5） | | |
| 2B-3 | 查 `profiles.line_user_id`，記下這個值（帳號 A 的 userId） | 已寫入帳號 A 的 userId | | |
| 2B-4 | 用測試手機 B（**帳號 B，不同於帳號 A**）掃描**第二組** QR | 畫面顯示綁定失敗，錯誤訊息含「已綁定其他 LINE 帳號」字樣（`/api/member/counter-bind-complete` 回 409） | | |
| 2B-5 | 再次查 `profiles.line_user_id` | **仍然是帳號 A 的 userId，沒有被帳號 B 覆蓋** ← 這是這項測試要驗證的核心事實 | | |
| 2B-6 | 用測試手機 A 重新整理 `/member`（不用重新掃 QR，既有 `member_session` cookie 應該還在） | 帳號 A 仍然能正常使用會員頁面，不受帳號 B 那次失敗嘗試影響 | | |

若 2B-5 這步查到的 userId 變成帳號 B（覆蓋掉了帳號 A），代表單次失效
設計沒有生效，**這是阻擋上線的問題，必須排查後才能繼續往下**（可能是
`bindLineUserIdToCustomer` 的條件式 UPDATE 沒有正確生效，或 Supabase
連線層級有預期外的行為，需要回頭檢查程式碼，不是驗收劇本能決定要不要
放行的事）。

---

## 三、`push_enabled` 緊急開關驗證（你裁決新增）

**已知的程式行為（驗收前先核對過程式碼，不是猜測）**：`sendNotification`
在 `push_enabled=false` 時走 `finish(supabase, input, { status: "skipped",
reason: "push_disabled_by_admin" })`，而 `finish()` 對**任何**結果
（`sent`/`failed`/`skipped`）都會無條件寫一筆 `notifications_log`，
`skipped` 狀態的 `error_message` 欄位就是 `reason`。**也就是說「關閉
推播時是否留下紀錄」這件事現況已經確認：會留下紀錄，不是無聲跳過**
——你原本的問題（若無聲跳過要不要補記錄）在目前實作下不成立，這裡驗收
只是拿真機結果核對這個程式碼判讀是否正確，不是重新討論要不要補功能。

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 3-1 | `/admin/message-templates` 頁面最上方找到「LINE 推播緊急關閉開關」，確認目前顯示「正常發送中」 | 綠色/正常狀態，按鈕文字為「立即關閉推播」 | | |
| 3-2 | 點擊「立即關閉推播」 | 畫面立刻變成「已關閉」狀態（橘紅色背景），按鈕文字變「恢復推播」 | | |
| 3-3 | 查 `system_settings` | `key='push_enabled'` 的 `value` 為 `false` | | |
| 3-4 | 對 2A 那位已綁定的測試會員，在 `/admin` 建一筆新的代客預約（觸發 `booking_confirmed`） | 建單本身成功（推播關閉不影響建單，見既有 fire-and-forget 慣例） | | |
| 3-5 | 觀察該會員手機 LINE | **沒有**收到任何推播 | | |
| 3-6 | 查 `notifications_log`，找剛剛那筆 `booking_confirmed` | 有一筆紀錄，`status='skipped'`、`error_message='push_disabled_by_admin'`（驗證上面「已知的程式行為」這段描述屬實） | | |
| 3-7 | 回 `/admin/message-templates`，點擊「恢復推播」 | 畫面變回「正常發送中」 | | |
| 3-8 | 查 `system_settings` | `push_enabled` 的 `value` 回到 `true` | | |
| 3-9 | 再對同一位會員建一筆新的代客預約 | 這次手機**正常收到**推播，`notifications_log` 該筆 `status='sent'` | | |

若 3-6 查到的紀錄跟「已知的程式行為」描述不符（例如根本沒有這筆紀錄，
或 `error_message` 是別的字串），代表程式碼在驗收之間被改動過或核對
有誤，**回頭重新讀一次 `notificationSender.ts` 目前的實際內容**，不要
直接改這份劇本的預期結果將就過去。

---

## 四、`deposit_flow_enabled` 開關驗證（你裁決新增）

**目的**：確認「上線時關閉訂金流程」這個開關的語意正確——不是巧合
（新資料庫天然沒有爽約歷史），是這個開關真的在生效。做法：故意讓
測試會員**先有**爽約紀錄，再驗證開關關閉時仍然不收訂金；接著把開關
打開一次，驗證同一位客人這次真的被要求收訂金——**兩種狀態都要測**，
只測「關閉時不收」不足以證明開關真的有作用（也可能是別的原因剛好
沒觸發），兩態都測完才算真正驗證了「開關語意正確」。

### 前置準備：製造一筆爽約紀錄

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 4-0a | 在 `warmjar-booking-prod` 建第三位測試會員（**用真實手機號碼，因為等一下要走 `/book` 自助預約，需要收 OTP**——見下方提醒） | 建立成功 | | |
| 4-0b | `/admin` 幫這位會員建一筆**日期在今天以前**的測試預約（任何師傅/服務皆可） | 建單成功，狀態 `confirmed` | | |
| 4-0c | 到行事曆/會員詳情頁把這筆預約標記為「爽約」（no_show） | 該預約 `status='no_show'` | | |
| 4-0d | 查會員詳情頁「訂金與爽約」分頁 | 目前訂金狀態顯示「近期爽約，需付訂金」（`flagged_no_show`） | | |

**⚠️ OTP 提醒（見 §4.3 已知落差）**：`/book` 自助預約走的是既有 OTP
流程，正式環境（`NODE_ENV=production`）驗證碼**不會**顯示在 API
回應裡，只會印在 server log。這步你需要能存取 Vercel 正式環境的
server log 才能拿到驗證碼（比照 §4.3 選項 A 的做法），或者改用你自己
能收到簡訊/能查 log 的手機號碼建立這位測試會員。

### 4A：`deposit_flow_enabled=false`（上線時的預設值）驗證不收訂金

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 4A-1 | 查 `system_settings` 確認 `deposit_flow_enabled` 目前是 `false`（上線預設值，不用特別設定） | `value = false` | | |
| 4A-2 | 用這位有爽約紀錄的測試會員，走 `https://book.warmjar.com.tw/book` 完整跑一次自助預約（含 OTP 驗證，見上方提醒） | 送出預約成功 | | |
| 4A-3 | 檢查 `/api/book/create-appointment` 的回應 JSON | `requiresDeposit: false`、`depositAmount: 0`、`merchantTradeNo: null` | | |
| 4A-4 | 查該筆新預約的 `appointments.status` | `confirmed`（不是 `pending_deposit`） | | |
| 4A-5 | 觀察畫面 | 沒有出現任何要求付訂金/導去 ECPay 的畫面 | | |

### 4B：暫時打開 `deposit_flow_enabled=true`，驗證同一位客人這次會被要求訂金

目前 `/admin` 沒有這個開關的切換 UI（跟 `push_enabled` 不同，§4.2 沒有
排這項），這步用 Supabase SQL Editor 直接改：

```sql
UPDATE system_settings SET value = 'true'::jsonb WHERE key = 'deposit_flow_enabled';
```

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 4B-1 | 執行上面的 SQL | `deposit_flow_enabled` 變成 `true` | | |
| 4B-2 | **同一位**有爽約紀錄的測試會員，再走一次 `/book` 自助預約（新的一筆，不是重複送出剛剛那筆） | 送出後畫面應該出現訂金相關提示/導向 ECPay 付款頁 | | |
| 4B-3 | 檢查這次 `/api/book/create-appointment` 的回應 JSON | `requiresDeposit: true`、`depositAmount` 為正數（totalFaceValue 的一半，取整十）、`merchantTradeNo` 有值 | | |
| 4B-4 | 查這筆新預約的 `appointments.status` | `pending_deposit` | | |
| 4B-5 | **測試完畢，把開關改回上線預設值**： `UPDATE system_settings SET value = 'false'::jsonb WHERE key = 'deposit_flow_enabled';` | `deposit_flow_enabled` 回到 `false`，不要讓正式環境帶著 `true` 進入上線 | | |

4A 全過 + 4B 全過，才代表這個開關真的雙向都在生效，不是巧合。若 4A
過但 4B 沒有真的觸發訂金（例如還是 `confirmed`），代表開關本身沒接對，
**這是阻擋上線的問題**，不能帶著這個狀態往下做五區真實客人驗證。

**測試資料清理提醒**：這一區（含二區、三區）建立的測試會員/測試預約/
爽約紀錄，都是寫進 `warmjar-booking-prod`（正式庫）的真實資料列，
不是隔離的測試環境。全部驗收通過、確定不需要保留當佐證後，建議手動
清掉（或至少在 `internal_note` 標記「測試資料，非真實客人」），避免
之後報表/客量統計把測試資料算進去。

---

## 五、真實客人第一筆綁定/推播驗證（對應 F-5，需要真的有第一位客人配合）

一～四區全過**且測試資料已清理**，才進這一區。這是整份劇本唯一一區
不是用測試資料，動作前務必再次確認前四區沒有殘留任何 ✗。

### 5A：真實客人第一筆綁定

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 5A-1 | 挑一位真實來店/來電的客人，臨櫃用「產生 LINE 綁定連結」（比照二區 2A 流程，但這次是真人） | 客人完成綁定 | | |
| 5A-2 | 查 `warmjar-booking-prod` 的 `profiles` 表 | 出現一筆 `role='customer'`、`line_user_id` 有值的紀錄，透過 `customers.profile_id` 關聯到正確的 `customers` 列（老客人：`phone` 對得上店內既有資料；新客人：新建的 `customers` 列） | | |
| 5A-3 | 查 `notifications_log` | 沒有任何跟這位客人相關的 `failed` 紀錄（綁定流程本身不寫 log，這步只是先確認乾淨） | | |

### 5B：真實客人第一筆推播

| 步驟 | 操作 | 預期結果 | 實際 | ✓/✗ |
|---|---|---|---|---|
| 5B-1 | 該客人（已完成綁定）由店員在 `/admin` 建立第一筆真實預約 | 建單成功 | | |
| 5B-2 | 觀察該客人手機 | 收到 `booking_confirmed` 推播，內容（姓名/時間/師傅/項目）與剛建立的預約相符 | | |
| 5B-3 | 查 `notifications_log`，該筆 `template_key='booking_confirmed'` | `status='sent'` | | |
| 5B-4 | 查正式環境 server log | 看到 `[tokenManager] issued new token` 或 `cache hit`（**不是** fallback WARN） | | |
| 5B-5 | `/admin` 日結報表「LINE 訊息額度」區塊 | 顯示的用量數字有反映這一筆，讀到的是 `warmjar-booking-prod` 對應的真實 channel 用量 | | |

---

## 六、收尾

- [ ] 全表結果回填，任何 ✗ 項目記錄現象與 log 摘要
- [ ] 二～四區的測試資料已清理或標記
- [ ] 驗收結果落檔 `design-log.md`
- [ ] 通過後：Wave 3 正式關閉，Phase 7-A 上線
