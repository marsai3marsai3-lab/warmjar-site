-- ============================================================
-- 溫罐子預約管理系統 — Phase 3-3：會員管理需要的欄位/新表
-- 日期：2026-07-11
-- ============================================================
--
-- 1. customers.rating：內部評分（1-5），owner 限定編輯（見
--    src/lib/admin/auth.ts 的 requireOwnerForAction）。可為 NULL＝
--    尚未評分，不強迫每個客人都要有分數。
ALTER TABLE public.customers
  ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5);

-- 2. member_notes：師傅/店員的服務調理筆記。photo_urls 先留空陣列
--    欄位——照片上傳功能綁定 Phase 6 的電子同意書機制才開放（見
--    docs/design-log.md 2026-07-11 決策 E.1），本階段 UI 只做占位，
--    不會真的寫入這個欄位。
CREATE TABLE public.member_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         text NOT NULL,
  photo_urls   text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_member_notes_customer_id ON public.member_notes(customer_id);
