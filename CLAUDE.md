# CLAUDE.md — 溫罐子預約管理系統

## 專案定位
為「溫罐子 Warm Jar」（屏東市莊敬街一段104號，按摩養生館）開發的
預約 + 會員 + 儲值 + 結帳管理系統，功能對標台灣美業系統「夯客 HOTCAKE」，
並與現有官網整合為同一個 Next.js 專案。

## 技術棧（不可擅自更換）
- 框架：Next.js 14+ (App Router) + TypeScript
- 樣式：Tailwind CSS + shadcn/ui
- 內容管理：Sanity CMS（僅管理行銷內容：服務介紹、文章、圖片）
- 交易資料庫：Supabase（PostgreSQL + Auth + Row Level Security + Realtime）
- 部署：Vercel
- 金流：綠界 ECPay（全方位金流，redirect 模式；定金、儲值、電子發票代申請）
- 通知：LINE Messaging API + LINE Login（LIFF）
- 表單驗證：zod；資料存取：Supabase JS client（server-side 優先）

> 目前實際安裝版本為 Next.js 16.2.10 + React 19 + Tailwind CSS v4（scaffold 當下的最新穩定版，符合「14+」要求）。
> Next.js 版本較新，行為可能與訓練資料中的慣例不同，動工前請先看 [AGENTS.md](AGENTS.md) 指向的
> `node_modules/next/dist/docs/`，留意 breaking changes 與 deprecation notice。

## 路由結構
- `/`               官網（既有，勿動）
- `/book`           客人預約端（手機優先，可從 LINE 圖文選單進入）
- `/member`         會員專區（LIFF：查預約、儲值餘額、票券、紅利）
- `/admin`          商家管理端（老闆/店長，PWA）
- `/staff`          師傅端（個人班表與預約，PWA）
- `/api/*`          Route Handlers（ECPay callback、LINE webhook 等）

## 商業規則（最高優先，違反即為 bug）
1. **師傅抽成一律以「服務面額」計算**，與客人實付金額（折扣、儲值優惠、
   票券折抵後）無關。結帳資料必須同時保存 face_value 與 paid_amount。
2. **儲值方案三階**：暖心 / 沐光 / 御藏。儲值本金與贈額分開記帳
   （principal / bonus 兩欄），退費只退本金餘額。
3. **預約提醒策略**：不做「當日預約當日提醒」，採「隔日回訪 + 前一日提醒」。
   （實測當日預約 no-show 率高，此為老闆營運洞察，不可改成業界預設。）
4. **法規合規**：全站文案不得出現醫療效能宣稱。禁用：治療、療效、醫治、
   舒緩痠痛（涉醫療）。使用：放鬆、舒壓、保養、民俗調理。服務名稱以
   既有價目表為準。任何新增 UI 文案先以此規則自查。
5. 時區一律 Asia/Taipei；金額一律整數（新台幣元），不用浮點數。

## 品牌視覺
- 色系：米白 #F5F1E8（底）、陶土色 #C67B5C（主）、植物綠 #6B7F5E（輔）、
  金色 #C9A961（點綴）
- 字體：思源黑體（Noto Sans TC）；標題可用襯線體點綴
- 風格：溫暖、放鬆、專業、不廉價。禁止使用刺眼的促銷紅。

## 開發紀律
- 每個 Phase 結束必須：可 build、通過 lint、關鍵邏輯有測試（Vitest）。
- 資料庫變更一律寫 migration SQL 檔（supabase/migrations/），不手改。
- 所有敏感操作（結帳、退費、改儲值餘額）寫 audit_logs。
- 金流與 LINE 的 secret 一律走環境變數，不得寫死。
- 可用性計算（找空檔）必須是純函式並有單元測試，這是全系統最容易出錯的核心。
