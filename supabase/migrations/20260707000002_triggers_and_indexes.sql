-- ============================================================
-- 溫罐子預約管理系統 — Phase 1 觸發器與 updated_at 維護
-- 日期：2026-07-07
-- ============================================================

-- ── 通用 updated_at trigger function ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 各需要 updated_at 的表掛上 trigger
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_stored_value_accounts_updated_at
  BEFORE UPDATE ON public.stored_value_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_loyalty_points_accounts_updated_at
  BEFORE UPDATE ON public.loyalty_points_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 常用查詢索引 ─────────────────────────────────────────────

-- 預約：依客人、日期、狀態查詢
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX idx_appointments_date_status ON public.appointments(appointment_date, status);

-- 結帳
CREATE INDEX idx_checkouts_customer_id ON public.checkouts(customer_id);
CREATE INDEX idx_checkouts_checkout_at ON public.checkouts(checkout_at);

-- 通知
CREATE INDEX idx_scheduled_notifications_scheduled_at_status
  ON public.scheduled_notifications(scheduled_at, status)
  WHERE status = 'pending';

-- 儲值流水帳
CREATE INDEX idx_sv_transactions_customer ON public.stored_value_transactions(account_customer_id);

-- 抽成
CREATE INDEX idx_commission_records_staff_settled
  ON public.commission_records(staff_id, settled);

-- audit_logs
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_table, target_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
