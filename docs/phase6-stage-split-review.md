# Review：phase6-stage-split-design.md 對照現有程式碼

> 狀態：**review 完成，待老闆確認** — 本檔案只做「草案 vs 現有程式碼」的落差比對與
> 修正建議，不改動任何程式碼。待確認後才依此排入實作。
> 對照對象：[phase6-stage-split-design.md](phase6-stage-split-design.md)（草案）
> 與目前 main 分支已完成的 Phase 6 骨架（commit `15f32e1`，219 測試）。

## 一、落差總表

### 1. Token Manager 影響範圍被低估：`getLineConfig()` 是三方共用的單一 all-or-nothing gate

`src/lib/line/lineConfig.ts:7-13` 目前是這樣：

```ts
export function getLineConfig(): LineConfig | null {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelId || !channelSecret || !channelAccessToken) return null;
  return { channelId, channelSecret, channelAccessToken };
}
```

三個呼叫端各自只需要其中一部分，但目前是「三個都有才給」的單一物件：
- `pushLineMessage`（`lineClient.ts:9-27`）只需要 `channelAccessToken`。
- `verifyLineIdToken`（`lineClient.ts:37-52`，LIFF 登入/綁定用）只需要 `channelId`。
- webhook route（`src/app/api/line/webhook/route.ts:18-19`）只需要 `channelSecret` 驗簽，但拿不到完整
  config 就直接回 500（"config error"），連 `follow`/`unfollow` 都處理不了。

草案 §「.env.local 變數異動」計畫把 `LINE_CHANNEL_ACCESS_TOKEN` **不填**。若照現有
`getLineConfig()` 邏輯原樣不動，這會讓 `getLineConfig()` 永遠回傳 `null`——不是只有推播
壞掉，**LIFF 登入（`verifyLineIdToken`）跟 webhook 簽章驗證會一起壞掉**，因為三者共用
同一個 all-or-nothing gate。草案「程式面調整」只提到「推播改走 Token Manager」，沒提到
這個耦合，範圍描述不完整。

### 2. 「既有測試中假設靜態 token 者需改為 mock Token Manager」——這個前提不成立

實際確認 `src/lib/line/` 下只有 4 個測試檔：`templateRender.test.ts`、
`webhookSignature.test.ts`、`flexMessageBuilder.test.ts`、`notificationSweep.test.ts`，
全部是純函式測試（字串代換、HMAC 驗簽、JSON 組裝、日期窗口判斷），**沒有任何一個
測試呼叫、mock 或間接經過** `pushLineMessage`、`verifyLineIdToken`、`getLineConfig`、
`sendNotification`、`runDailyNotificationSweep`/`runDepositCronSweep`、webhook route
handler，或 `liff-bind`/`liff-complete-bind` 兩支 API route。全域搜尋
`LINE_CHANNEL_ACCESS_TOKEN`/`channelAccessToken`/`pushLineMessage` 在任何
`*.test.ts` 裡都是零命中。

草案第 53-57 行寫「既有測試中假設靜態 token 者需改為 mock Token Manager」——這句話
描述的情境不存在。實際狀況是：**這些路徑目前完全零測試覆蓋**，Token Manager 落地
不是「改既有 mock」，是「這些路徑第一次要補測試」，工作量被低估了，也沒有說清楚要
新增哪些測試檔（見下方「二、受影響的測試檔案清單」）。

### 3. Stage 6A 期間，unfollow 偵測會失效——「不碰 Webhook」的連鎖後果

`sendNotification`（`notificationSender.ts:54-56`）靠 `profiles.line_notify_blocked`
判斷要不要 skip 推播：

```ts
if (blocked) {
  return finish(supabase, input, { status: "skipped", reason: "客人已封鎖官方帳號" });
}
```

這個欄位**唯一的寫入來源**是 webhook route 收到 `unfollow` 事件時才會設成 `true`
（`route.ts:34-35`）。Stage 6A 明訂「不碰 Webhook URL，維持指向夯客」——代表我們自己
這支已經寫好的 webhook route，在 Stage 6A 全程**收不到任何真實事件**（因為 LINE
Console 的 Webhook URL 沒有指向它）。結果：客人封鎖官方帳號後，`line_notify_blocked`
永遠不會被設成 `true`，系統會持續對他推播、每次都注定失敗，一直寫入
`notifications_log` 的 `failed` 紀錄、浪費訊息額度。

這正是原始 Phase 6 草案 D.1 特別設計要避免的情境（"避免每次都打一次注定失敗的
API 且污染 notifications_log 的 failed 紀錄"）。新草案完全沒提到這個連鎖影響，也沒
提出緩解方案。建議的緩解方向：LINE push API 對已封鎖對象通常回傳特定錯誤（例如
`403`/找不到對象），可以讓 `pushLineMessage` 或 `sendNotification` 這一層在收到這類
錯誤時**順便**把 `line_notify_blocked` 標記為 `true`，不依賴 webhook 事件，Stage 6A
跟 Stage 6B 都適用（Stage 6B 拿回 webhook 後兩個來源並存也不衝突）。

### 4. 「自建 LIFF app」被列為 Stage 6A 新工作，但大部分已經做完

草案「範圍內」第 2 點寫「自建 LIFF app（新增，不動夯客既有 LIFF）」，底下列了「預約
Wizard 入口」「會員綁定」「電子同意書簽署」三個子項，讀起來像是同一個等級的新工作。
但實際上：
- `@line/liff` 已是既有依賴（`package.json:14`）。
- `src/components/member/MemberApp.tsx` 已完整實作 `liff.init()` → `liff.login()` →
  `liff.getIDToken()` → 呼叫 `/api/member/liff-bind` 的登入/綁定流程。
- `/api/member/liff-bind`、`/api/member/liff-complete-bind` 兩支 API 已存在且邏輯完整
  （idToken 驗證、OTP 二次確認、`findOrCreateCustomerForMember` 建立/合併會員）。

也就是說「會員綁定」這個子項**已經做完**，Stage 6A 真正剩下的只是「在 LINE Console
建立自己的 LIFF app、填 `NEXT_PUBLIC_LIFF_ID`、把 `verifyLineIdToken` 接上 Token
Manager」這種收尾工作，不是從零開發。草案應該把「已完成」跟「待做」分開標注，避免
驗收時雙方對「這項工作的範圍」認知不一致。

### 5. 「電子同意書簽署」才是真正從零開始的功能，不該跟已完成的 LIFF 綁定並列成同一個 bullet

`src/components/admin/MemberDetailView.tsx:435-439` 目前只有一個 disabled 佔位按鈕：

```tsx
<button
  type="button"
  disabled
  title="即將推出：照片上傳綁定 Phase 6 電子同意書機制才開放"
  ...
```

沒有任何簽署流程、同意書內容版本、簽署時間戳記錄、資料表。這是一個從零開始的功能
（畫面、資料結構、法遵文案都要新設計），跟「把 `pushLineMessage` 換成 Token Manager」
這種重構等級完全不同，工作量差距很大。建議在 Stage 6A 待辦裡拆成獨立子項、獨立估工，
不要跟「已完成的 LIFF 綁定」放在同一條 bullet 底下，否則容易低估這一項要花的時間。

### 6. 額度監控（quota API）目前完全沒有地基，草案沒寫實際要打的 endpoint

全 repo 搜尋 `quota`/`額度`/`usage` 相關字樣，沒有任何 LINE 訊息額度監控的程式碼
（現有唯一相關機制是 `src/lib/admin/manualSendPolicy.ts` 的「單一客人每日手動單發 3
則」上限，是防騷擾用的政策上限，跟 LINE 官方月配額完全是兩回事）。草案第 38-40 行
「呼叫 quota API 取得本月用量」沒有寫實際要打的 endpoint，實作前需要先核實 LINE
官方目前額度查詢 API 的路徑與回傳格式（例如 `GET /v2/bot/message/quota` 與
`GET /v2/bot/message/quota/consumption` 這兩支，需要對照當下最新官方文件確認），
並確認要掛進日結報表的哪個位置——這部分目前是完全空白的工作項，不是「掛在既有欄位
旁邊」那麼輕量。

---

## 二、受影響的測試檔案清單

**現有測試檔——不受影響，不需修改**（純函式測試，跟 token 機制無關）：
- `src/lib/line/templateRender.test.ts`
- `src/lib/line/webhookSignature.test.ts`
- `src/lib/line/flexMessageBuilder.test.ts`
- `src/lib/line/notificationSweep.test.ts`

**需要新增的測試檔**（目前都不存在，Stage 6A 落地必須補上，草案本身沒列出檔名）：

| 新檔案 | 涵蓋範圍 |
|---|---|
| `src/lib/line/tokenManager.test.ts` | token 發行成功、記憶體快取命中、到期前自動重發、發行失敗降級（草案第 57 行有提到這四種情境，但沒指定要落在哪個檔案） |
| `src/lib/line/lineConfig.test.ts` | 對應落差 1：驗證拆開後的 config gate 不會因為少了 `channelAccessToken` 就連帶讓 `verifyLineIdToken`／webhook 簽章驗證一起回傳「未設定」 |
| `src/lib/line/lineClient.test.ts` | `pushLineMessage`/`verifyLineIdToken` 改走 Token Manager 後，mock fetch 驗證 `Authorization` header 是動態發行的 token 而非讀 env 常數 |
| `src/lib/line/notificationSender.test.ts` | `sendNotification` 目前也是零測試，若要驗證「token 發行失敗時的降級行為（該回 `skipped` 還是 `failed`）」，建議這輪一併補上，否則 Token Manager 失敗路徑的下游行為仍是黑盒 |
| `src/app/api/line/webhook/route.test.ts`（可選，視落差 3 的緩解方案而定） | 若採「push 失敗時順便標記 blocked」的緩解方案，這支路由不受影響；若改成在 webhook 之外新增標記入口，才需要對應新測試 |

---

## 三、建議修正

1. 草案第 53-57 行「既有測試中假設靜態 token 者需改為 mock Token Manager」改寫為準確
   敘述：這些路徑目前零測試覆蓋，Stage 6A 要新增 `tokenManager.test.ts` /
   `lineConfig.test.ts` / `lineClient.test.ts` / `notificationSender.test.ts` 等新
   測試檔，並把上表直接併入草案，不要用一句話帶過。
2. 明確拆開 `getLineConfig()` 的耦合：`channelId`/`channelSecret`（靜態組態）跟
   token（動態、來自 Token Manager）應該是兩個獨立來源，`verifyLineIdToken` 與
   webhook route 不該因為 Token Manager 發行失敗就連帶壞掉。
3. 把「Stage 6A 期間 unfollow 偵測不到」的風險與緩解方案（落差 3）補進草案第
   118-126 行的風險登錄表，並選定緩解做法（建議：`pushLineMessage`／
   `sendNotification` 收到 LINE API 判定「已封鎖/找不到對象」的錯誤時，直接由呼叫端
   寫入 `line_notify_blocked`，不依賴 webhook 事件）。
4. 把「自建 LIFF app」bullet 拆開，標注已完成部分（`liff.init`/`login`/idToken 綁定
   流程、`liff-bind`/`liff-complete-bind` 兩支 API）跟真正剩下的收尾工作（Console
   設定 LIFF app、接上 Token Manager），避免驗收時對「這項工作的範圍」認知落差。
5. 「電子同意書簽署」拆成獨立待辦、獨立估工，不要跟已完成的 LIFF 綁定併在同一個
   bullet 底下。
6. 額度監控補上實際要打的 LINE API endpoint（需先核實官方文件當下路徑是否仍是
   `GET /v2/bot/message/quota` 與 `/v2/bot/message/quota/consumption`），並指定要
   掛進日結報表的哪個區塊，否則這項目前無法排工。

---

## 四、本 review 不涉及的部分

草案「五、待確認事項」（第 129-134 行，channel 權限、夯客合約到期日、Stage 6A 推播
場景清單、電子同意書是否確定放 6A）是需要老闆本人回覆的商業/合約問題，不是程式碼
落差，本 review 不代為回答，維持原樣等老闆確認。

草案「一、資源衝突地圖」與「範圍外——夯客保護鐵律」清單，跟現有程式碼比對後**沒有
發現落差**（webhook/Rich Menu/自動回覆的禁區判斷正確；Rich Menu 全 repo 搜尋零命中，
確實尚未開始）。
