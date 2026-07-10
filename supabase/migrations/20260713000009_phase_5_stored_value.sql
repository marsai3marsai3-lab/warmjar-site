-- ============================================================
-- 溫罐子預約管理系統 — Phase 5：儲值方案系統
-- 日期：2026-07-13
-- 對應 docs/phase-5-stored-value-draft.md 與 docs/stored-value-rules.md
-- ============================================================

-- 1. 銷售歸屬（師傅銷售儲值獎金的歸屬記錄，見 stored-value-rules.md）
ALTER TABLE public.stored_value_topup_orders
  ADD COLUMN sold_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- 2. 流水帳補欄位：plan_id/sold_by 去正規化直接放在流水帳上（不用
--    join 回 stored_value_topup_orders 就能做「按人按月彙總本金
--    銷售額」查詢，見草案 B.3）；expires_at 是贈額到期的預留欄位，
--    這輪一律 NULL（贈額目前無到期日）。
ALTER TABLE public.stored_value_transactions
  ADD COLUMN plan_id uuid REFERENCES public.stored_value_plans(id) ON DELETE SET NULL,
  ADD COLUMN sold_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN expires_at timestamptz;

-- 3. 補「作廢回沖」type——跟客人主動退費（refund，只退本金、贈額
--    歸零）語意不同：回沖是「這筆消費從沒真的發生」，本金贈額原路
--    退回，贈額不受影響。混在一起會讓月結對帳分不清贈額增加的原因。
ALTER TABLE public.stored_value_transactions
  DROP CONSTRAINT stored_value_transactions_type_check,
  ADD CONSTRAINT stored_value_transactions_type_check
    CHECK (type IN ('topup','consume','refund','adjustment','void_reversal'));

-- 4. 儲值購買付款拆分（草案 B.1 決策：採納，支援現金+刷卡混合付款，
--    UX 跟結帳付款組合一致）。
CREATE TABLE public.stored_value_topup_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topup_order_id uuid NOT NULL REFERENCES public.stored_value_topup_orders(id) ON DELETE RESTRICT,
  method         text NOT NULL CHECK (method IN ('cash','ecpay_credit','ecpay_transfer')),
  amount         int NOT NULL CHECK (amount > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_value_topup_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_stored_value_topup_payments_order_id
  ON public.stored_value_topup_payments(topup_order_id);

CREATE INDEX idx_stored_value_transactions_sold_by_created_at
  ON public.stored_value_transactions(sold_by, created_at)
  WHERE sold_by IS NOT NULL;

-- 5. 種子資料：三階方案（金額見 docs/stored-value-rules.md）
INSERT INTO public.stored_value_plans (tier, name, principal_amount, bonus_amount, sort_order) VALUES
  ('暖心', '暖心會員', 5000, 200, 1),
  ('沐光', '沐光會員', 10000, 750, 2),
  ('御藏', '御藏會員', 20000, 1750, 3);

-- 註：checkouts.stored_value_principal_used / stored_value_bonus_used
-- 不需要 migration，Phase 1 就已經建好，這輪第一次真正使用。
