-- ============================================================
-- 溫罐子預約管理系統 — Phase 3-2 追加：手動建單客人搜尋 + 來源選項
-- 日期：2026-07-10
-- ============================================================
--
-- 1. customers.phone 已有 UNIQUE 約束帶的 btree 索引，但那是預設
--    collation，無法有效支援 `phone LIKE '0989%'` 這種開頭符合查詢
--    （除非資料庫是 C locale）。另外補一個 text_pattern_ops 索引，
--    讓前綴搜尋在 customers 長到數千筆時仍然吃得到索引。
CREATE INDEX idx_customers_phone_pattern ON public.customers (phone text_pattern_ops);

-- 2. 手動建單來源新增「官方LINE」「IG」兩個管道（店員在這些平台上
--    手動接單建檔，不是客人透過 LIFF 自動預約——那個是 Phase 5 的
--    source='line'，跟這裡的 'line_oa' 是兩回事，刻意用不同值區分，
--    避免以後报表把「店員手動接單」跟「客人自助預約」混在一起算。
ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_source_check,
  ADD CONSTRAINT appointments_source_check
    CHECK (source IN ('line','phone','walk_in','admin','web','line_oa','instagram'));
