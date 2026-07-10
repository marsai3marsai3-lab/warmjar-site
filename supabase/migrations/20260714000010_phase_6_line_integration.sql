-- ============================================================
-- 溫罐子預約管理系統 — Phase 6：LINE 整合（LIFF 會員 + Messaging API）
-- 日期：2026-07-14
-- 對應 docs/phase-6-line-integration-draft.md
-- ============================================================
--
-- profiles.line_user_id 與 role='customer' 在 Phase 1 就已經存在
-- （見草案 0 節），這裡不用再補；只補通知系統需要的兩張新表，以及
-- 一個「客人封鎖官方帳號」的旗標。

-- 1. 客人封鎖官方帳號旗標——封鎖後 push 一定失敗，發送前先查這個
--    旗標直接跳過，避免每次都打一次注定失敗的 API 並污染
--    notifications_log 的 failed 紀錄。
ALTER TABLE public.profiles
  ADD COLUMN line_notify_blocked boolean NOT NULL DEFAULT false;

-- 2. message_templates：owner 後台可編輯的通知範本。content 是固定
--    版型的 jsonb（title/bodyLines/footerNote/buttonText/buttonUrl，
--    line_text 頻道則是 {text}），不是自由 Flex JSON——避免後台手滑
--    打壞整份 Flex 訊息結構（見草案 B.2）。
CREATE TABLE public.message_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  name         text NOT NULL,
  channel      text NOT NULL DEFAULT 'line_flex' CHECK (channel IN ('line_flex','line_text')),
  content      jsonb NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- 3. notifications_log：每一則實際發送（或嘗試發送）的紀錄。
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

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_log_customer_id ON public.notifications_log(customer_id, created_at);

-- 排程掃描的冪等保險：同一筆預約、同一種範本，成功發送過就不能再發
-- （見草案 B.3）。手動單發（admin_manual）不受此限——櫃檯可能真的
-- 需要對同一筆預約重複發同一種提醒，只有系統排程（system_cron /
-- system_event）需要防重複，所以這個唯一索引只挑 template_key 屬於
-- 排程會用到的三種 key，手動發送用的 key 不受影響。
CREATE UNIQUE INDEX idx_notifications_log_dedupe
  ON public.notifications_log (related_appointment_id, template_key)
  WHERE status = 'sent'
    AND related_appointment_id IS NOT NULL
    AND triggered_by IN ('system_cron', 'system_event');

-- 4. 通知排程時間設定（owner 可在後台調整，決策 4：提醒 20:00／
--    關懷 12:30）。存在 system_settings 既有的 key/value 設計，不用
--    額外開表。
INSERT INTO public.system_settings (key, value) VALUES
  ('notification_schedule', '{"reminder_day_before":"20:00","revisit_care":"12:30"}'::jsonb);

-- 5. 種子範本內容（可在 /admin/message-templates 調整；revisit_care
--    文案已由老闆定稿 2026-07-10，見 design-log.md 該日條目）。
INSERT INTO public.message_templates (key, name, channel, content) VALUES
(
  'booking_confirmed',
  '預約成功通知',
  'line_flex',
  '{
    "title": "預約成功",
    "bodyLines": [
      "{{name}} 您好，您的預約已確認：",
      "📅 {{date}}（{{weekday}}）{{startTime}}",
      "師傅：{{staffName}}",
      "項目：{{serviceName}}"
    ],
    "footerNote": "地址：屏東市莊敬街一段104號\n如需異動，請於預約前 1 小時透過會員專區操作，或直接來電。",
    "buttonText": "查看我的預約",
    "buttonUrl": "{{memberUrl}}"
  }'::jsonb
),
(
  'deposit_payment_link',
  '訂金付款連結',
  'line_flex',
  '{
    "title": "訂金付款通知",
    "bodyLines": [
      "{{name}} 您好，這筆預約需要收取訂金：",
      "訂金金額：NT$ {{depositAmount}}",
      "請於 {{expiresAt}} 前完成付款，逾時保留時段將自動釋放"
    ],
    "footerNote": null,
    "buttonText": "前往付款",
    "buttonUrl": "{{paymentUrl}}"
  }'::jsonb
),
(
  'deposit_expiring_soon',
  '訂金即將逾期提醒',
  'line_flex',
  '{
    "title": "訂金保留時段即將到期",
    "bodyLines": [
      "{{name}} 您好，您預約的時段保留即將到期：",
      "📅 {{date}} {{startTime}}",
      "尚未收到訂金付款，時段將於 {{expiresAt}} 釋放"
    ],
    "footerNote": null,
    "buttonText": "前往付款",
    "buttonUrl": "{{paymentUrl}}"
  }'::jsonb
),
(
  'reminder_day_before',
  '前一日提醒',
  'line_flex',
  '{
    "title": "明日預約提醒",
    "bodyLines": [
      "{{name}} 您好，提醒您明天有一筆預約：",
      "📅 {{date}}（{{weekday}}）{{startTime}}",
      "{{staffName}}・{{serviceName}}"
    ],
    "footerNote": "若需改期或取消，請於預約前 1 小時透過會員專區操作。",
    "buttonText": "查看/取消預約",
    "buttonUrl": "{{memberUrl}}"
  }'::jsonb
),
(
  'revisit_care',
  '隔日回訪關懷',
  'line_flex',
  '{
    "title": "{{name}} 您好 🌿",
    "bodyLines": [
      "昨天謝謝您來溫罐子，讓我們為您調理。",
      "今天身體的感覺還好嗎？調理後的一兩天，有些人會覺得比較放鬆想睡，記得多喝溫水、讓身體慢慢代謝。",
      "若有任何地方覺得緊繃或不舒服，隨時傳訊息告訴我們，我們都在 😊"
    ],
    "footerNote": null,
    "buttonText": null,
    "buttonUrl": null
  }'::jsonb
);
