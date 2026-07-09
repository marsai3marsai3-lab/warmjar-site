-- ============================================================
-- 溫罐子預約管理系統 — Phase 4：結帳（POS）與抽成系統
-- 日期：2026-07-12
-- 對應 docs/phase-4-checkout-draft.md 與 docs/design-log.md
-- 2026-07-12 決策，補齊草案盤點出的 5 個 schema 缺口。
-- ============================================================

-- 1. checkout_payments：混合付款金額拆分（取代 checkouts.payment_method
--    直接輸入，該欄位改為由這張表推導的顯示用欄位）。stored_value／
--    coupon 先放進 CHECK 約束但 UI 不開放，留給儲值 Phase 接上時直接
--    開放輸入，不用再動一次 migration。
CREATE TABLE public.checkout_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE RESTRICT,
  method      text NOT NULL
                CHECK (method IN ('cash','ecpay_credit','ecpay_transfer','stored_value','coupon')),
  amount      int NOT NULL CHECK (amount > 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_checkout_payments_checkout_id ON public.checkout_payments(checkout_id);

-- 2. deposit_records.applied_checkout_id：訂金折抵防重複使用的判斷
--    依據。status 繼續保持 'paid'（錢確實收到了），這個欄位只回答
--    「這筆錢有沒有被用在某張結帳單上」，兩者是獨立的事實。
ALTER TABLE public.deposit_records
  ADD COLUMN applied_checkout_id uuid REFERENCES public.checkouts(id) ON DELETE SET NULL;

CREATE INDEX idx_deposit_records_applied_checkout_id
  ON public.deposit_records(applied_checkout_id)
  WHERE applied_checkout_id IS NOT NULL;

-- 3. 作廢重開需要的欄位。checkouts.status/void_reason 在 Phase 1 就有，
--    這裡補 voided_by/voided_at（比照 Phase 3-2 deposit_records.waived_by
--    的既有慣例）跟 reopened_from_checkout_id（新單指回被作廢的舊單，
--    供稽核追溯）。commission_records 完全沒有作廢欄位，一併補上——
--    作廢時只標記 voided=true，不刪除紀錄，報表查詢一律加
--    WHERE voided=false。
ALTER TABLE public.checkouts
  ADD COLUMN voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN reopened_from_checkout_id uuid REFERENCES public.checkouts(id) ON DELETE SET NULL;

ALTER TABLE public.commission_records
  ADD COLUMN voided boolean NOT NULL DEFAULT false,
  ADD COLUMN voided_at timestamptz;

-- 4. services.default_commission_rate：抽成率三層解析的中間層（見
--    docs/design-log.md 2026-07-12 決策 §5.1：override > 服務預設 >
--    師傅保底）。DEFAULT 40.00 只是讓既有服務有個起始值通過
--    NOT NULL 約束，實際數字要店主在 /admin/commission-rates 逐一
--    核對調整，不代表這是最終定價。
ALTER TABLE public.services
  ADD COLUMN default_commission_rate numeric(5,2) NOT NULL DEFAULT 40.00;

-- 5.5 checkouts.payment_method 改為「由 checkout_payments 推導」的顯示
--     欄位（見草案 1.3），但有一個實作時才發現的邊界案例：訂金全額
--     折抵、當場不用再收任何新款項時，checkout_payments 是空的，沒有
--     東西可以推導——原本的 CHECK 約束沒有涵蓋這種情況，補上 'deposit'
--     這個值，專門描述「這筆結帳完全由已付訂金折抵，沒有新收款」。
ALTER TABLE public.checkouts
  DROP CONSTRAINT checkouts_payment_method_check,
  ADD CONSTRAINT checkouts_payment_method_check
    CHECK (payment_method IN ('cash','ecpay_credit','ecpay_transfer','stored_value','mixed','deposit'));

-- 6. 訂金沒收（依決策 §5.2：標記爽約時手動確認，非自動）不需要新增
--    欄位——deposit_records.status 的 CHECK 約束在 Phase 3-2
--    （20260709000005）已經包含 'forfeited'，revenue_records 的
--    revenue_type CHECK 在 Phase 1 就已經包含 'forfeited_deposit'。
--    這裡純粹是應用層邏輯（no_show 確認框的勾選項），schema 已經
--    準備好，不需要動它。
