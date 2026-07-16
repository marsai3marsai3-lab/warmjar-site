# 設計草案：Phase 6 拆分為 Stage 6A / 6B（與夯客並存策略）— v2.2

> 狀態：**v2.2 定稿，6A-1 已關閉**（2026-07-20 首日 + 2026-07-21 隔日複查全數通過，
> 見 docs/design-log.md 對應條目與 docs/phase6-stage6a1-acceptance-guide.md）。
> 6A-2（電子同意書）設計草案已啟動排程，範圍見 §2.5，尚未定案。
> v2.2 變更（平台改制因應）：LINE 已改制，Messaging API channel **不可再新增
> LIFF app**（官方公告："Users can no longer add LIFF apps to Messaging API
> channels"，Console 已實地確認）。這連帶推翻了原始 Phase 6 草案 A.0「LIFF 要建在
> Messaging API 頻道底下，不要另開 LINE Login 頻道」的操作指示——不是這條指示錯了，
> 是**平台後來不允許這樣做了**。v2.2 因應：
> 1. **廢止 A.0 原則**，改為「自建 LIFF 必須掛在自建的 LINE Login channel 底下，
>    但這個 Login channel 要跟 Messaging API channel 建在同一個 **Provider**
>    （2002675868）底下」——A.0 原本擔心的「userId 對不上」問題，真正的判準是
>    **Provider 層級**共用同一份 userId 空間，不是「同一個 channel」（查證見
>    [LINE 官方文件](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/)：
>    「同一 Provider 底下不管是 LINE Login channel 還是 Messaging API channel，
>    同一個使用者的 userId 都是同一個值；不同 Provider 則各自發不同值」）。原始
>    A.0 的操作結論剛好因為 Messaging API channel 底下的 LIFF 天然跟頻道同一個
>    Provider 而「湊巧正確」，但寫的判準（頻道層級）不精確，v2.2 一併修正。
> 2. 資源衝突地圖新增列：見 §一。
> 3. `verifyLineIdToken` 的 idToken 驗證 audience 改用新環境變數
>    `LINE_LOGIN_CHANNEL_ID`（自建 LINE Login channel 的 Channel ID），不再用
>    Messaging API 的 `LINE_CHANNEL_ID`——因為 idToken 是那個 Login channel 簽發
>    的，audience 天然對應到它，不是 Messaging API channel。
> v2.1 變更：§2.3 修正確認後追加兩點——(a) 統一 log 原因字串為
> `"profile_404"`（不寫「已封鎖或非好友」這種混合敘述，兩者處置相同、
> 沒有必要在 log 裡假裝分得清楚）；(b) 補上解封鎖恢復路徑：客人成功
> 走完 LIFF 登入/綁定時（`liff-bind`／`liff-complete-bind`），代表他
> 當下一定不是封鎖狀態，順手清掉 `line_notify_blocked`，否則被 §2.3
> 前置檢查誤標或舊資料標記過的客人，即使解除封鎖也會在 Stage 6A 期間
> 永久收不到推播。
> 前提：溫罐子 Messaging API channel（ID: 2004034061）目前由夯客 HOTCAKE 佔用 Webhook、
> Rich Menu、自動回覆。本草案目標為 Stage 6A 期間**絕對不影響夯客運作**，Stage 6B
> （全面取代）掛帳延後。
>
> v2 變更依據：[phase6-stage-split-review.md](phase6-stage-split-review.md) 六條落差
> 全數接受並回覆處置方式，本版依處置逐項改寫。**唯一一項處置在落地時發現技術前提不
> 成立、已就地修正並在下方標明**：處置 3（unfollow 反應式偵測）原本設想「從 Push
> API 錯誤碼判斷封鎖」，經查證 LINE 官方行為後**此路不通**，改用替代機制，詳見
> §2.3。其餘五項處置照使用者原意落實，無修正。

---

## v2.2 變更摘要（相對 v2.1，平台改制因應）

| # | 觸發原因 | v2.2 因應 |
|---|---|---|
| 1 | Messaging API channel 不可再新增 LIFF app（平台改制，非本專案可控） | 廢止 A.0「不另開 LINE Login channel」原則，改為自建 LIFF 必須掛在自建的 LINE Login channel，見 §2.4 |
| 2 | 自建 Login channel 要放哪才能保住同一份 userId？ | 真正判準是 **Provider**（不是 channel），自建 Login channel 建在 Messaging API channel 的同一個 Provider（2002675868）底下即可，見 §一查證 |
| 3 | 夯客在同一 Provider 下已有自己的 LINE Login channel「溫罐子」（Published） | 列入禁碰清單，比照既有 LIFF 禁碰邏輯，見「範圍外」清單 |
| 4 | `verifyLineIdToken` 原本用 Messaging API 的 `channelId` 當 audience，平台改制後不再對應 | 改讀新環境變數 `LINE_LOGIN_CHANNEL_ID`，見 §2.4 |

---

## v2 變更摘要（相對 v1）

| # | Review 落差 | 使用者處置 | v2 落實方式 |
|---|---|---|---|
| 1 | `getLineConfig()` 全有全無 gate | Config 拆分，`LINE_CHANNEL_ACCESS_TOKEN` 降為過渡期選用 | §2.1 |
| 2 | 「既有測試改 mock」前提不成立 | 改口徑為淨新增，既有 4 檔不動 | §2.2 |
| 3 | unfollow 盲區 | 反應式偵測（Push API 錯誤碼判斷封鎖） | §2.3 **技術前提不成立，已改用 GetProfile 前置檢查替代機制，v2.1 已確認接受，並補上解封鎖恢復路徑** |
| 4 | 自建 LIFF 範圍描述失真 | 改寫為「Console 設定 + 接 Token Manager」 | §2.4 |
| 5 | 電子同意書工作量被低估 | 拆為 6A-2 獨立子項，不阻擋 6A-1 | §2.5 |
| 6 | 額度監控空白 | 具體化 endpoint | §2.6 |

---

## 一、資源衝突地圖（channel 層級資源盤點）

**v2.2 更新**：LIFF app 那一列因平台改制已經不準確（Messaging API channel 不能再
掛 LIFF），新增兩列因應（自建 LINE Login channel、夯客既有 LINE Login channel）；
userId 那一列的「歸屬層級」修正為 Provider（查證見上方 v2.2 變更說明）。

| 資源 | 歸屬層級 | 夯客是否佔用 | Stage 6A 可否使用 |
|---|---|---|---|
| ~~LIFF app（掛 Messaging API channel）~~ | ~~channel 下可掛多支~~ | — | ❌ **平台已停止支援**，LINE 官方公告 Messaging API channel 不可再新增 LIFF app，此路徑作廢，見下方新增列 |
| **（v2.2 新增）自建 LINE Login channel** | Provider 下可建多個 channel | 不衝突（新建） | ✅ 自建 LIFF 必須掛在這裡，命名 `warmjar-booking`，**必須**建在 Provider 2002675868 底下（跟 Messaging API channel 同一個 Provider，才會拿到同一份 userId） |
| **（v2.2 新增）夯客既有 LINE Login channel「溫罐子」（Published）** | 同一 Provider 下的既有 channel | 佔用 | ❌ 禁碰（唯讀，不編輯、不刪除、不誤觸任何設定——跟夯客既有 LIFF 的禁碰邏輯相同） |
| Channel access token（long-lived，Messaging API channel） | channel 唯一一把 | 極可能佔用 | ❌ 禁碰（Reissue 會使夯客 token 失效） |
| Stateless token（v3，Messaging API channel） | 隨發隨用、15 分鐘效期 | 不衝突 | ✅ Stage 6A 主要 token 來源 |
| Webhook URL（Messaging API channel） | channel 唯一一個 | 佔用（指向夯客伺服器） | ❌ 禁碰（含 Verify 按鈕、Use webhook 開關） |
| Rich Menu（預設，Messaging API channel） | OA 同時僅一份生效 | 佔用 | ❌ 禁碰（不建立、不設定 default） |
| 自動回覆 / 加好友歡迎詞 | OA 層級唯一 | 佔用 | ❌ 禁碰（manager.line.biz 不動任何設定） |
| 訊息額度（月配額） | OA 層級共用 | 共用中 | ⚠️ 可用但需估量監控 |
| LINE userId | **Provider 層級**共用（v2.2 修正：不是 channel 層級，同 Provider 下不管 LINE Login 或 Messaging API channel 拿到的都是同一個值，見上方查證連結） | 共用（利多） | ✅ 自建 Login channel 只要跟 Messaging API channel 同 Provider，userId 天然對得上 |

---

## 二、Stage 6A：純推播 + LIFF（零衝突，立即可做）

### 2.0 子階段劃分：6A-1（推播骨架）與 6A-2（電子同意書）

處置 5 落實：6A-1 是本階段主體（Token Manager、既有 LIFF 綁定流程收尾、unfollow
偵測、額度監控），6A-2（電子同意書簽署）獨立排程、獨立驗收，**不阻擋 6A-1 驗收**。
6A-2 範圍先落設計草案（見 §2.5），本檔案這輪只定 6A-1。

---

### 2.1 Config 拆分（處置 1）

`src/lib/line/lineConfig.ts` 目前是「`channelId`/`channelSecret`/`channelAccessToken`
三個都有才給」的單一物件，`pushLineMessage`、`verifyLineIdToken`、webhook route 三個
呼叫端各自只需要其中一部分，導致拿掉 `LINE_CHANNEL_ACCESS_TOKEN` 會連帶打壞 LIFF
登入跟 webhook 簽章驗證（review 落差 1）。v2 拆成兩層：

```ts
// lineConfig.ts —— 核心組態，channelId + channelSecret 必填，
// 不再跟 access token 綁在一起
export type LineCoreConfig = { channelId: string; channelSecret: string };

export function getLineCoreConfig(): LineCoreConfig | null {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) return null;
  return { channelId, channelSecret };
}
```

```ts
// tokenManager.ts —— access token 的唯一來源，內部決定「動態發行」
// 或「過渡期 fallback」，呼叫端（pushLineMessage）不需要知道差異
export type AccessTokenResult = { ok: true; token: string } | { ok: false; error: string };

export async function getAccessToken(): Promise<AccessTokenResult> {
  // 1. 記憶體快取命中且未到期 → 直接回傳
  // 2. 快取未命中/已過期 → 用 channelId + channelSecret 呼叫
  //    POST /oauth2/v3/token（grant_type=client_credentials）發行 stateless
  //    token，成功則寫入快取（建議 12 分鐘刷新，token 本身 15 分鐘效期）
  // 3. 發行失敗（網路錯誤/LINE API 錯誤）且環境變數 LINE_CHANNEL_ACCESS_TOKEN
  //    存在 → 降級使用該長期 token，並記一筆告警 log（過渡期 fallback，
  //    最終棄用，見下方時程）
  // 4. 發行失敗且沒有 fallback token → 回傳 { ok: false }
}
```

`LINE_CHANNEL_ACCESS_TOKEN` 的處置：**降為選用**，Stage 6A 上線初期先保留在
`.env.local`（不刪除，Console 上該 long-lived token 本來就已經 Issue 過，保留不影響
夯客），Token Manager 動態發行穩定運行一段時間（建議兩週無 fallback 觸發紀錄）後，
再移除這個 env var，正式棄用 fallback 路徑。`pushLineMessage` 改呼叫
`getAccessToken()` 拿 token；webhook route 只呼叫 `getLineCoreConfig()`，不再因為
access token 缺失而回 500。**v2.2 修正**：`verifyLineIdToken` 從來不需要
access token，只需要一個 channel ID 當 audience（見 §一 v2.2 變更、下方 §2.4）——
平台改制後這個 channel ID 換成 `LINE_LOGIN_CHANNEL_ID`，跟 `getLineCoreConfig()`／
`getAccessToken()` 都無關，是獨立的第三個組態來源，不要混在一起。

---

### 2.2 測試策略：淨新增（處置 2）

Review 已確認現有 `src/lib/line/` 下 4 個測試檔（`templateRender.test.ts`、
`webhookSignature.test.ts`、`flexMessageBuilder.test.ts`、`notificationSweep.test.ts`）
全是純函式測試，跟 token 機制無關，**維持原樣不動**。Stage 6A-1 落地需要新增：

| 新檔案 | 涵蓋範圍 |
|---|---|
| `src/lib/line/tokenManager.test.ts` | 發行成功、快取命中、到期前重發、發行失敗降級到 fallback token、fallback 也沒有時回傳失敗 |
| `src/lib/line/lineConfig.test.ts` | `getLineCoreConfig()` 只檢查 `channelId`/`channelSecret`，不再受 access token 有無影響 |
| `src/lib/line/lineClient.test.ts` | `pushLineMessage`/`verifyLineIdToken` 改走 `getAccessToken()` 後，mock fetch 驗證 `Authorization` header 是動態 token |
| `src/lib/line/notificationSender.test.ts` | `sendNotification` 對 token 取得失敗、封鎖偵測（見 §2.3）等分支的下游行為 |
| ~~`src/app/api/line/webhook/route.test.ts`~~ | **落地時判斷不需要**：webhook route 只是把 `getLineConfig()` 換成 `getLineCoreConfig()`，簽章驗證/follow-unfollow 邏輯完全沒變，沒有新增分支，沿用既有「webhook route 本身不寫測試」的慣例即可 |

---

### 2.3 unfollow 反應式偵測——⚠️ 原設計技術前提不成立，已改用替代機制

**這是本輪唯一需要你重新確認的處置。** 你原本核准的方案是「`sendNotification` 收到
LINE Push API 回傳的『已封鎖/非好友』類錯誤時自動標記」，我在落地前查證 LINE 官方
行為，發現這個前提不成立：

> **LINE Push Message API 對「已封鎖官方帳號」或「已刪除帳號」的收件對象，回傳的是
> HTTP 200（成功），不是錯誤。** 這是 LINE 官方文件明載的行為（"If you send a
> message specifying a user who has blocked your LINE Official Account or a user
> who deleted their account, no error will occur and status code 200 will be
> returned as a response."），且這類訊息不計入額度。也就是說 **Push API 的回應
> 本身沒有任何欄位可以拿來判斷對方是不是已經封鎖**——不存在你要我列的「封鎖類錯誤碼
> /訊息對照表」，因為根本沒有這個訊號可以列。
>
> LINE 官方 FAQ 也明講：目前**沒有任何 API 可以主動查詢「這個 userId 是不是我的
> 好友」**，官方唯一建議的方式就是 webhook 的 follow/unfollow 事件——這正是原始
> Phase 6 草案設計走 webhook 的原因，也是 Stage 6A 拿不到這個訊號的根本原因（Stage
> 6A 不碰 webhook URL）。
>
> 來源：[Retry failed API requests](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/)、
> [Send messages](https://developers.line.biz/en/docs/messaging-api/sending-messages/)、
> LINE Developers FAQ（"There is no endpoint to determine if a user is a friend
> of your LINE Official Account"）。

**替代機制**：LINE 另外有一支 `GET /v2/bot/profile/{userId}`（取得使用者資料），
對「已封鎖/非好友」的對象回傳 **404**（這支端點雖然沒有官方明文保證行為對等於
「封鎖偵測」，但實務上是唯一有回應差異可用的訊號）。改成**推播前置檢查**：

```ts
// sendNotification 在呼叫 pushLineMessage 之前，先呼叫這支：
async function checkStillReachable(lineUserId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token.ok) return true; // token 拿不到時不誤判封鎖，讓 push 那層去處理錯誤
  const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  return res.status !== 404;
}
```

- 回傳 404 → 直接標記 `profiles.line_notify_blocked = true`，跳過這次推播，
  `notifications_log` 寫 `status='skipped'`、`error_message='profile_404'`。
  **v2.1 確認**：404 不區分「已封鎖」跟「從未加好友」，兩者處置完全相同
  （都推不到），log 原因統一記這個字串就好，不假裝分得清楚。
- 回傳 200 → 正常送出推播。
- 這支呼叫本身失敗（網路錯誤等）→ 不誤判封鎖，照原本邏輯繼續嘗試推播，避免
  「偵測機制本身掛掉」變成「所有人都被誤標封鎖」。

**v2.1 新增：解封鎖恢復路徑**——上面的機制只會「標記」，沒有對應的「解除」，
若不補上，被誤標或曾經封鎖過的客人即使後來解除封鎖／重新加好友，
`line_notify_blocked` 會卡在 `true` 上不會自動變回來，Stage 6A 期間永久收
不到任何推播。解法：客人成功完成 LIFF 登入/綁定（`liff-bind`／
`liff-complete-bind` 兩支既有 route）本身就是最強的「未封鎖」證明——能打開
LIFF、能拿到 idToken，代表當下一定不是封鎖狀態——所以在這兩支 route 簽發
`member_session` 的同一時間點，順手清掉 `line_notify_blocked`：

```ts
// liff-bind / liff-complete-bind route 綁定成功分支內
await clearLineNotifyBlockedFlag(supabase, verifyResult.lineUserId);
```

`clearLineNotifyBlockedFlag` 是單行 DB 寫入、沒有分支邏輯，比照 webhook
route 現有同類寫法的慣例不特別寫 mock 測試，改在下方 Stage 6A-1 驗收標準
新增一項用真機覆蓋（先封鎖 → 確認被標記且不再收推播 → 解除封鎖並重新走
LIFF 登入 → 確認恢復收推播）。

**取捨**：這是每次推播多一次 API 呼叫的代價（`GET /v2/bot/profile` 有自己的
rate limit，不計入訊息月配額），换來「不會對已封鎖對象持續打注定被靜默吞掉的
push、也不會一直污染 `notifications_log`」。跟 webhook 事件驅動比，這個機制**永遠
是「推播當下才知道」，不是「封鎖當下就知道」**，中間有時間差，但這是 Stage 6A 不碰
webhook 的必然代價，不是這個機制設計不良。

Stage 6B 拿回 webhook 後（見 §3），webhook 的 follow/unfollow 事件變成**主要**、
即時的標記來源，這裡的 GetProfile 前置檢查降級為**第二道防線**（保留，用來處理
webhook 因故漏接事件、或使用者在切換過渡期封鎖等邊界情況），不刪除。

---

### 2.4 自建 LIFF：已完成範圍 vs 剩餘工作（處置 4）

原 v1「自建 LIFF app（新增...)」這條 bullet 描述失真，v2 拆開：

**已完成，不用重做**（`src/components/member/MemberApp.tsx`、
`/api/member/liff-bind`、`/api/member/liff-complete-bind`）：
- `liff.init()` → `liff.login()` → `liff.getIDToken()` 完整登入流程
- idToken 後端驗證（`verifyLineIdToken`，呼叫 LINE 官方 `/oauth2/v2.1/verify`）
- 首次綁定走 OTP 二次確認（`findOrCreateCustomerForMember`），之後每次免 OTP 直接
  簽發 `member_session`
- `@line/liff` 已是既有依賴（`package.json`）

**Stage 6A-1 剩餘工作**（收尾等級，不是從零開發，**v2.2 因應平台改制更新**）：
- ~~LINE Developers Console 建立自己的 LIFF app（在 Messaging API 頻道底下...)~~
  **作廢**：平台已不允許 Messaging API channel 掛 LIFF app（見上方 v2.2 變更說明、
  §一）。改為三步驟：
  1. 於 Provider 2002675868 底下**新建 LINE Login channel**（命名
     `warmjar-booking`，跟夯客既有的「溫罐子」Login channel 區分，那支是禁碰項）
  2. 於這個新 Login channel 的 LIFF 分頁**新增 LIFF app**（Endpoint URL 填
     cloudflared 臨時網址；Size: Full；Scope: `profile`、`openid`）
  3. 抄兩個值：新 Login channel 的 **Channel ID**（填
     `LINE_LOGIN_CHANNEL_ID`）與新建的 **LIFF ID**（填 `NEXT_PUBLIC_LIFF_ID`）
- `verifyLineIdToken`（`lineClient.ts`）的 idToken 驗證 audience（`client_id`）改用
  `getLineLoginChannelId()`（讀 `LINE_LOGIN_CHANNEL_ID`），不再用
  `getLineCoreConfig()` 的 Messaging API `channelId`——這支函式本來就只需要一個
  channel ID 當 audience，不需要 access token，v2.1 時誤把它跟 `getAccessToken()`
  寫在一起只是敘述不精確，v2.2 一併訂正（實際程式碼從 v2.1 落地時就沒有真的呼叫
  `getAccessToken()`）

---

### 2.5 電子同意書簽署——獨立為 6A-2（處置 5）

`MemberDetailView.tsx` 目前只有 disabled 佔位按鈕，沒有任何簽署流程、資料表、UI，
是從零開始的功能。獨立為 6A-2，本檔案這輪先定範圍、不展開實作細節（另立設計草案），
排程另定：

- **簽名擷取**：`/member` 內嵌簽名板（canvas 手寫簽名，或至少「我同意」勾選 +
  電子時間戳，兩種方案的法遵效力需先確認需要哪一種）
- **存檔**：同意書內容版本（文案異動需要留歷史版本，不能覆蓋舊版）、簽署時間戳、
  簽署當時的同意書版本快照——三者缺一都會讓「客人簽的到底是哪一版」變成舉證漏洞
- **與服務紀錄照片的依賴關係**：`MemberDetailView.tsx:437` 的照片上傳佔位按鈕
  明確寫「綁定 Phase 6 電子同意書機制才開放」（`design-log.md` 2026-07-11 E.1
  決策），6A-2 完成前，服務紀錄照片上傳維持 disabled

6A-2 不阻擋 6A-1 的推播/LIFF 綁定驗收，兩者驗收各自獨立進行。

---

### 2.6 訊息額度監控：具體化 endpoint（處置 6）

| Endpoint | 用途 | 回應欄位 |
|---|---|---|
| `GET /v2/bot/message/quota` | 本月推播訊息上限（依 OA 方案級距） | `type`（`"none"` 無限制／`"limited"` 有上限）、`value`（上限則數，`type="limited"` 時才有） |
| `GET /v2/bot/message/quota/consumption` | 本月已發送則數 | `totalUsage` |

兩支都用 `Authorization: Bearer {stateless token}`（跟 push 共用 §2.1 的
`getAccessToken()`，不需要另外的權限範圍）。日結報表新增一區塊顯示「本月已用 /
上限」（`totalUsage` / `value`，`type="none"` 時顯示「無上限」），沿用既有日結報表
（Phase 4 收官）的版面風格，不需要新頁面。實作前建議先用真實 channel 打一次這兩支
確認回應格式跟目前官方文件描述一致（LINE API 偶有欄位微調）。

---

### 2.7 驗收 1-2 發現的規格洞：後台代客建單原本沒接推播（已補）

真機驗收標準 1（Token Manager 煙霧測試）第一步「/admin 手動建一筆測試會員的
預約」時發現：手動建單成功，但完全沒收到推播。逐段排查（server log →
`notifications_log` → `profiles.line_user_id` → 程式路徑）確認 `profiles`／
Token Manager／封鎖偵測全部正常，卡點在**`createManualAppointment`（後台代客
建單的 Server Action）從一開始就沒有呼叫 `sendNotification`**——原始草案 B.4
的觸發條件字面上只寫 `create-appointment` API（`/book` 自助預約那條路），沒有
涵蓋後台建單，是規格範圍原本就沒包進去的洞，不是 bug。

已補上（`src/app/admin/(ops)/appointments/new/_actions.ts`）：建單成功後呼叫
`notifyBookingConfirmed`（`src/lib/line/notificationSender.ts` 新增的共用
helper），`triggeredBy` 沿用 `system_event`（跟 `/book` 那條路共用同一個值，
不是 `admin_manual`——`admin_manual` 是既有「會員詳情頁手動單發」功能專用，
且被排除在 `idx_notifications_log_dedupe` 唯一索引外，混用會讓後台建單失去
重複發送防護，也讓報表分不清兩種情境；要分辨這筆通知是哪個 UI 觸發的，查
`appointments.source` 即可，不靠 `triggered_by` 承擔）。失敗不影響建單本身
（fire-and-forget，比照 `/book` 既有慣例）。**本輪刻意不處理**
`deposit_payment_link`——後台建單一律直接 `confirmed`、不走訂金流程，這個 key
天生不適用，若未來後台建單也要支援訂金情境需另外設計，已掛帳（見
`design-log.md`）。完整的觸發條件表更新見
`phase-6-line-integration-draft.md` B.4 補註；程式面細節與新增測試見
`design-log.md` 對應日期條目。

---

### 範圍外（絕對禁區——夯客保護鐵律，與 v1 一致）

- ❌ 不點擊 long-lived token 的「Issue / Reissue」
- ❌ 不修改 Webhook URL、不切換 Use webhook 開關、不按 Verify
- ❌ 不建立或設定任何 Rich Menu（含 API 呼叫 set default）
- ❌ 不動 manager.line.biz 的自動回覆、歡迎訊息、任何 OA 設定
- ❌ 不編輯、不刪除夯客既有的 LIFF app
- ❌ **（v2.2 新增）**不編輯、不刪除夯客既有的 LINE Login channel「溫罐子」
  （Published，同 Provider 底下，跟既有 LIFF 的禁碰邏輯相同）
- ❌ 不在 Console 刪除或修改任何非自建的資源

> **v2.2 更新**操作原則：Console 內做三件事——(a) 抄錄 Messaging API channel 的
> Channel ID / Secret（唯讀）；(b) 於**同一 Provider** 底下新建自己的 LINE Login
> channel（`warmjar-booking`）；(c) 於這個新 Login channel 底下新增自己的 LIFF
> app。其餘（含夯客既有的 LINE Login channel「溫罐子」）一律唯讀。

### .env.local 變數異動

| 變數 | Stage 6A-1 處置 |
|---|---|
| LINE_CHANNEL_ID | 照填（Messaging API channel Basic settings 抄錄） |
| LINE_CHANNEL_SECRET | 照填（同上，唯讀抄錄不影響任何人） |
| LINE_CHANNEL_ACCESS_TOKEN | **降為選用**，保留作為 Token Manager 發行失敗時的過渡期 fallback，穩定運行後移除（見 §2.1） |
| **（v2.2 新增）LINE_LOGIN_CHANNEL_ID** | 填自建 LINE Login channel（`warmjar-booking`）的 Channel ID，`verifyLineIdToken` 拿這個當 idToken 驗證的 audience（見 §2.4） |
| NEXT_PUBLIC_LIFF_ID | 填自建 LIFF 的 ID（掛在上面那個自建 Login channel 底下，不是 Messaging API channel） |
| CRON_SECRET | 自行產生（openssl rand -hex 32） |

### Stage 6A-1 驗收標準

1. 真機收到預約確認推播（Push API + stateless token，非 fallback 長期 token）
2. 真機開啟自建 LIFF → 授權 → 取得 userId → 綁定會員成功
3. cron 提醒推播於正確時間送達
4. **夯客迴歸檢查（必做）**：
   - 傳訊息給 OA，夯客自動回覆仍正常
   - 夯客 Rich Menu 仍正常顯示與運作
   - 走一次夯客預約流程，通知仍送達
   - 全程完成後隔日再抽查一次
5. 額度監控數字（本月已用/上限）可正確顯示
6. unfollow 偵測：真機用測試帳號封鎖官方帳號 → 觸發一次推播 → 確認
   `line_notify_blocked` 被標記、`notifications_log` 記錄 `profile_404`、後續
   不再對該帳號嘗試推播
7. **（v2.1 新增）解封鎖恢復路徑**：接續第 6 項，該測試帳號解除封鎖並重新
   完成一次 LIFF 登入/綁定 → 確認 `line_notify_blocked` 恢復為 `false` →
   再觸發一次推播應正常送達（不再被跳過）
8. tsc / lint / build / 測試全綠（既有 4 個 LINE 測試檔 + §2.2 新增測試檔）

---

## 三、Stage 6B：全面取代夯客（掛帳，時機另定）

### 觸發條件（缺一不可）

- Stage 6A-1（與視排程情況的 6A-2）已上線穩定運行
- 群發、事件處理等自建功能完備度足以覆蓋夯客現有功能
- 夯客合約到期日確認，切換時點排定

### 範圍（屆時才動的衝突資源）

1. **Webhook 接管**
   - 自建 `/api/line/webhook` 完成 follow / message / postback 全事件處理
   - 切換即時生效、回滾即改回原 URL（切換前抄錄夯客原 Webhook URL 作為回滾憑據）
   - **unfollow 偵測改為事件驅動即時標記為主**（§2.3 的 GetProfile 前置檢查降級
     為第二道防線，保留不刪除）
2. **Rich Menu 替換**
   - 自建選單設計 → 建立 → 一次性設為 default
3. **自動回覆 / 歡迎詞接管**（manager.line.biz 或改由 Webhook 處理）
4. **資料延續**
   - userId 因同 channel 天然延續（好友名單不變，此為不另建 channel 的最大紅利）
   - 夯客內的歷史預約 / 顧客資料匯出可行性，需提前與夯客確認
5. **切換 Runbook**（屆時另立草案）：切換順序、驗證清單、回滾程序、停用夯客訂閱時點

### 掛帳登錄

以下項目移入 design-log 帳本，標記「Stage 6B」：

- Webhook 事件處理接管（含 unfollow 事件驅動標記正式取代反應式偵測為主要來源）
- Rich Menu 設計與替換
- 群發引擎（依賴 Webhook 退訂處理，故綁 6B）
- LINE 線上儲值購買（LIFF 部分可 6A 先建，金流通知若依賴 Webhook 則 6B）
- 夯客資料匯出協商
- 切換 Runbook 與回滾演練

---

## 四、風險登錄

| 風險 | 等級 | 緩解 |
|---|---|---|
| 誤觸 Reissue 使夯客 token 失效 | 高 | 禁區清單 + Console 操作僅限兩項 |
| 推播爆量吃掉共用額度 | 中 | 上線前估算 + §2.6 額度監控 + 告警 |
| 夯客偵測到異常（多一把 token 的 API 流量） | 低 | stateless token 屬正常 API 行為，LINE 允許並行 |
| LIFF 新增誤刪夯客 LIFF | 低 | 操作時逐一核對 LIFF ID，禁刪任何非自建項目 |
| **（v2 新增）unfollow 偵測有時間差** | 中 | §2.3 GetProfile 前置檢查是「推播當下才知道」，封鎖到下次該客人被排入推播之間，理論上仍可能發生 1 次注定失敗的浪費呼叫；Stage 6B 事件驅動後消除此時間差 |
| **（v2 新增）GetProfile 前置檢查本身失敗時的誤判** | 低 | 檢查本身網路/API 錯誤時**不**判定封鎖（見 §2.3 程式碼），避免偵測機制掛掉導致全體誤標封鎖 |

---

## 五、待確認事項

1. Channel 權限是否已認回（老婆帳號 Provider 確認結果）？
2. 夯客合約到期日？（決定 6B 排程）
3. Stage 6A-1 推播場景清單是否如上四項，或需增減？
4. ~~§2.3 替代機制是否同意~~ — **v2.1 已確認接受**，並補上解封鎖恢復路徑，6A-1
   已依此進入實作，不再是待確認事項。
5. ~~6A-2（電子同意書）獨立草案排程時間點~~ — **已決：6A-1 關閉後立即接續**，
   見 docs/design-log.md 2026-07-21 條目，不待觀察期。
