-- ============================================================
-- 溫罐子預約管理系統 — Phase 3-2：/admin 後台需要的欄位
-- 日期：2026-07-09
-- ============================================================
--
-- 1. appointments.checked_in_at：報到是一個里程碑標記，不是終態，
--    所以不新增 status 列舉值（維持 completed/cancelled/no_show
--    才是「最終結果」狀態的語意），改用可為 NULL 的時間戳記。
-- 2. deposit_records 補上 'waived'（人工免收訂金）狀態，以及
--    waived_by／waived_by_at 記錄操作者與時間，對應 audit_logs
--    的稽核需求（Phase 2 掛帳、這裡補上）。

ALTER TABLE public.appointments
  ADD COLUMN checked_in_at timestamptz;

ALTER TABLE public.deposit_records
  ADD COLUMN waived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN waived_by_at timestamptz;

ALTER TABLE public.deposit_records
  DROP CONSTRAINT deposit_records_status_check,
  ADD CONSTRAINT deposit_records_status_check
    CHECK (status IN ('pending','paid','refunded','forfeited','failed','waived'));
