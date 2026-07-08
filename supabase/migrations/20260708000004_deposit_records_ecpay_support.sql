-- ============================================================
-- 溫罐子預約管理系統 — Phase 3-1：deposit_records 補上 ECPay
-- 金流串接需要的欄位
-- 日期：2026-07-08
-- ============================================================
--
-- 背景：deposit_records 原始設計（0001_init_schema.sql）是 1 筆
-- deposit_records 對 1 筆 appointment_id，但 Phase 2B 的多服務預約
-- 會一次建立多筆 appointments（同一次到店、依序切時段），訂金是
-- 整筆到店金額的 50%，不是每個 appointment 各自的訂金。這支
-- migration 補上：
--
-- 1. merchant_trade_no：我們自己產生的訂單編號，ECPay 要求送出
--    AioCheckOut 時就要有；Webhook 回來時用它（不是 ecpay_trade_no
--    ——那是 ECPay 自己的交易編號，付款成功後才會有）反查對應的
--    deposit_records 列。
-- 2. covered_appointment_ids：這筆訂金實際涵蓋的所有 appointment
--    id（多服務預約會是多筆）。appointment_id 欄位保留當作主要
--    關聯（指向第一筆），covered_appointment_ids 是完整清單，
--    Webhook 收到付款成功時要依這份清單把每一筆都轉成 confirmed。
-- 3. status 補上 'failed'：ECPay 可能回傳付款失敗的 Webhook，需要
--    跟「pending（還沒付）」分開記錄，才看得出「使用者試過但失敗」
--    跟「使用者還沒去付款」的差別。

ALTER TABLE public.deposit_records
  ADD COLUMN merchant_trade_no text,
  ADD COLUMN covered_appointment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.deposit_records
  ALTER COLUMN merchant_trade_no SET NOT NULL;

CREATE UNIQUE INDEX deposit_records_merchant_trade_no_key
  ON public.deposit_records (merchant_trade_no);

ALTER TABLE public.deposit_records
  DROP CONSTRAINT deposit_records_status_check,
  ADD CONSTRAINT deposit_records_status_check
    CHECK (status IN ('pending','paid','refunded','forfeited','failed'));
