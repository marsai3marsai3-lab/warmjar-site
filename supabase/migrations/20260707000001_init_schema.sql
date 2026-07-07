-- ============================================================
-- 溫罐子預約管理系統 — Phase 1 初始 Schema
-- 版本：v2 final（對應 supabase/schema-draft.md）
-- 日期：2026-07-07
-- ============================================================

-- ── 0. Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ── 1. profiles（雙軌身分，最先建，其他表外鍵皆指向此表）────
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            text NOT NULL CHECK (role IN ('owner','manager','staff','customer')),
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  line_user_id    text UNIQUE,
  display_name    text,
  phone           text,
  avatar_url      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 2. customers ─────────────────────────────────────────────
CREATE TABLE public.customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                text NOT NULL,
  phone               text UNIQUE,
  email               text,
  gender              text,
  birthday            date,
  source              text,
  internal_note       text,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','blacklisted','inactive')),
  last_visit_at       timestamptz,
  churn_risk_score    numeric(5,2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ── 3. tags / customer_tags ───────────────────────────────────
CREATE TABLE public.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  color      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customer_tags (
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

-- ── 4. service_categories ────────────────────────────────────
CREATE TABLE public.service_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- ── 5. services ──────────────────────────────────────────────
CREATE TABLE public.services (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id          uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name                 text NOT NULL,
  description          text,
  is_active            boolean NOT NULL DEFAULT true,
  compliance_reviewed  boolean NOT NULL DEFAULT false,
  sort_order           int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ── 6. service_variants ──────────────────────────────────────
CREATE TABLE public.service_variants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name              text NOT NULL,
  duration_minutes  int NOT NULL,
  face_value_price  int NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;

-- ── 7. staff ─────────────────────────────────────────────────
CREATE TABLE public.staff (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id               uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name                     text NOT NULL,
  phone                    text UNIQUE,
  hire_date                date,
  default_commission_rate  numeric(5,2) NOT NULL,
  status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','leave','resigned')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ── 8. staff_service_skills ──────────────────────────────────
CREATE TABLE public.staff_service_skills (
  staff_id                 uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id               uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  commission_rate_override numeric(5,2),
  can_perform              boolean NOT NULL DEFAULT true,
  PRIMARY KEY (staff_id, service_id)
);

ALTER TABLE public.staff_service_skills ENABLE ROW LEVEL SECURITY;

-- ── 9. rooms ─────────────────────────────────────────────────
CREATE TABLE public.rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  capacity   int NOT NULL DEFAULT 1,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ── 10. staff_recurring_availability ─────────────────────────
CREATE TABLE public.staff_recurring_availability (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  weekday    int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time   time NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_recurring_availability ENABLE ROW LEVEL SECURITY;

-- ── 11. staff_schedules ──────────────────────────────────────
CREATE TABLE public.staff_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  work_date   date NOT NULL,
  start_time  time,
  end_time    time,
  is_day_off  boolean NOT NULL DEFAULT false,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date)
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- ── 12. appointments ─────────────────────────────────────────
CREATE TABLE public.appointments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_variant_id  uuid NOT NULL REFERENCES public.service_variants(id) ON DELETE RESTRICT,
  staff_id            uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  room_id             uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  appointment_date    date NOT NULL,
  start_time          time NOT NULL,
  end_time            time NOT NULL,
  start_at            timestamptz GENERATED ALWAYS AS
                        ((appointment_date + start_time) AT TIME ZONE 'Asia/Taipei') STORED,
  end_at              timestamptz GENERATED ALWAYS AS
                        ((appointment_date + end_time) AT TIME ZONE 'Asia/Taipei') STORED,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  source              text NOT NULL
                        CHECK (source IN ('line','phone','walk_in','admin','web')),
  customer_note       text,
  internal_note       text,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 防重疊約束（同師傅時段不重疊，排除 cancelled/no_show）
CREATE INDEX appointments_staff_tsrange_idx
  ON public.appointments USING gist (
    staff_id,
    tstzrange(start_at, end_at)
  )
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled','no_show');

-- ── 13. appointment_status_history ───────────────────────────
CREATE TABLE public.appointment_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status      text,
  new_status      text NOT NULL,
  changed_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason          text,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

-- ── 14. stored_value_plans ───────────────────────────────────
CREATE TABLE public.stored_value_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier             text NOT NULL CHECK (tier IN ('暖心','沐光','御藏')),
  name             text NOT NULL,
  principal_amount int NOT NULL,
  bonus_amount     int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_value_plans ENABLE ROW LEVEL SECURITY;

-- ── 15. stored_value_accounts ────────────────────────────────
CREATE TABLE public.stored_value_accounts (
  customer_id        uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE RESTRICT,
  principal_balance  int NOT NULL DEFAULT 0,
  bonus_balance      int NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_value_accounts ENABLE ROW LEVEL SECURITY;

-- ── 16. stored_value_topup_orders ────────────────────────────
CREATE TABLE public.stored_value_topup_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  plan_id          uuid REFERENCES public.stored_value_plans(id) ON DELETE SET NULL,
  principal_amount int NOT NULL,
  bonus_amount     int NOT NULL,
  payment_method   text NOT NULL,
  ecpay_trade_no   text,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_value_topup_orders ENABLE ROW LEVEL SECURITY;

-- ── 17. checkouts（先建，stored_value_transactions 需要 FK）─
CREATE TABLE public.checkouts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                 uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  checked_out_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checkout_at                 timestamptz NOT NULL DEFAULT now(),
  subtotal_face_value         int NOT NULL,
  total_paid_amount           int NOT NULL,
  discount_amount             int NOT NULL DEFAULT 0,
  deposit_applied             int NOT NULL DEFAULT 0,
  stored_value_principal_used int NOT NULL DEFAULT 0,
  stored_value_bonus_used     int NOT NULL DEFAULT 0,
  payment_method              text NOT NULL
                                CHECK (payment_method IN ('cash','ecpay_credit','ecpay_transfer','stored_value','mixed')),
  invoice_status              text NOT NULL DEFAULT 'not_requested'
                                CHECK (invoice_status IN ('not_requested','requested','issued','void')),
  ecpay_trade_no              text,
  status                      text NOT NULL DEFAULT 'completed'
                                CHECK (status IN ('completed','voided','refunded')),
  void_reason                 text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

-- ── 18. stored_value_transactions ────────────────────────────
CREATE TABLE public.stored_value_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_customer_id       uuid NOT NULL REFERENCES public.stored_value_accounts(customer_id) ON DELETE RESTRICT,
  type                      text NOT NULL CHECK (type IN ('topup','consume','refund','adjustment')),
  principal_delta           int NOT NULL DEFAULT 0,
  bonus_delta               int NOT NULL DEFAULT 0,
  related_topup_order_id    uuid REFERENCES public.stored_value_topup_orders(id) ON DELETE SET NULL,
  related_checkout_id       uuid REFERENCES public.checkouts(id) ON DELETE SET NULL,
  operator_id               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note                      text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_value_transactions ENABLE ROW LEVEL SECURITY;

-- ── 19. deposit_records ──────────────────────────────────────
CREATE TABLE public.deposit_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  amount          int NOT NULL,
  payment_method  text NOT NULL,
  ecpay_trade_no  text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','refunded','forfeited')),
  paid_at         timestamptz,
  refunded_at     timestamptz,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_records ENABLE ROW LEVEL SECURITY;

-- ── 20. checkout_items ───────────────────────────────────────
CREATE TABLE public.checkout_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id        uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE RESTRICT,
  item_type          text NOT NULL DEFAULT 'service' CHECK (item_type IN ('service','product')),
  appointment_id     uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  service_variant_id uuid REFERENCES public.service_variants(id) ON DELETE RESTRICT,
  staff_id           uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  face_value         int NOT NULL,
  paid_amount        int NOT NULL,
  quantity           int NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_items ENABLE ROW LEVEL SECURITY;

-- ── 21. commission_settlement_batches ────────────────────────
CREATE TABLE public.commission_settlement_batches (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  period_start            date NOT NULL,
  period_end              date NOT NULL,
  total_commission_amount int NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','confirmed','paid')),
  confirmed_at            timestamptz,
  paid_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_settlement_batches ENABLE ROW LEVEL SECURITY;

-- ── 22. commission_records ───────────────────────────────────
CREATE TABLE public.commission_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_item_id      uuid NOT NULL UNIQUE REFERENCES public.checkout_items(id) ON DELETE RESTRICT,
  staff_id              uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  commission_rate       numeric(5,2) NOT NULL,
  commission_amount     int NOT NULL,
  settlement_batch_id   uuid REFERENCES public.commission_settlement_batches(id) ON DELETE SET NULL,
  settled               boolean NOT NULL DEFAULT false,
  settled_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

-- ── 23. revenue_records ──────────────────────────────────────
CREATE TABLE public.revenue_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_type  text NOT NULL CHECK (revenue_type IN ('forfeited_deposit')),
  amount        int NOT NULL,
  source_table  text NOT NULL,
  source_id     uuid NOT NULL,
  customer_id   uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  recorded_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note          text,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;

-- ── 24. coupons ──────────────────────────────────────────────
CREATE TABLE public.coupons (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    text NOT NULL UNIQUE,
  name                    text NOT NULL,
  discount_type           text NOT NULL CHECK (discount_type IN ('fixed','percentage')),
  discount_value          int NOT NULL,
  min_spend               int,
  max_discount_amount     int,
  valid_from              timestamptz,
  valid_until             timestamptz,
  usage_limit_total       int,
  usage_limit_per_customer int NOT NULL DEFAULT 1,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ── 25. coupon_redemptions ───────────────────────────────────
CREATE TABLE public.coupon_redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id    uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  checkout_id  uuid REFERENCES public.checkouts(id) ON DELETE SET NULL,
  redeemed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- ── 26. loyalty_points_accounts ──────────────────────────────
CREATE TABLE public.loyalty_points_accounts (
  customer_id  uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE RESTRICT,
  balance      int NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points_accounts ENABLE ROW LEVEL SECURITY;

-- ── 27. loyalty_points_transactions ──────────────────────────
CREATE TABLE public.loyalty_points_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_customer_id  uuid NOT NULL REFERENCES public.loyalty_points_accounts(customer_id) ON DELETE RESTRICT,
  delta                int NOT NULL,
  reason               text NOT NULL
                         CHECK (reason IN ('earn_checkout','redeem','expire','manual_adjust')),
  related_checkout_id  uuid REFERENCES public.checkouts(id) ON DELETE SET NULL,
  operator_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points_transactions ENABLE ROW LEVEL SECURITY;

-- ── 28. referral_records ─────────────────────────────────────
CREATE TABLE public.referral_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_customer_id  uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE RESTRICT,
  referrer_customer_id  uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  referrer_input_raw    text,
  source                text NOT NULL CHECK (source IN ('self_registration','manual_backfill')),
  match_status          text NOT NULL DEFAULT 'pending'
                          CHECK (match_status IN ('pending','matched','unmatched')),
  matched_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  matched_at            timestamptz,
  reward_status         text NOT NULL DEFAULT 'not_applicable'
                          CHECK (reward_status IN ('not_applicable','pending','issued')),
  reward_type           text,
  reward_amount         int,
  reward_issued_at      timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;

-- ── 29. reminder_rules ───────────────────────────────────────
CREATE TABLE public.reminder_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  trigger_type     text NOT NULL
                     CHECK (trigger_type IN ('day_before_appointment','post_visit_followup')),
  offset_days      int NOT NULL,
  offset_hours     int NOT NULL DEFAULT 0,
  channel          text NOT NULL CHECK (channel IN ('line','sms')),
  message_template text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

-- ── 30. scheduled_notifications ──────────────────────────────
CREATE TABLE public.scheduled_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid REFERENCES public.reminder_rules(id) ON DELETE SET NULL,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  channel         text NOT NULL,
  scheduled_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at         timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- ── 31. notification_logs ────────────────────────────────────
CREATE TABLE public.notification_logs (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_notification_id    uuid REFERENCES public.scheduled_notifications(id) ON DELETE SET NULL,
  customer_id                  uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  channel                      text NOT NULL,
  content_snapshot             text NOT NULL,
  line_message_id              text,
  status                       text NOT NULL CHECK (status IN ('sent','failed')),
  sent_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- ── 32. audit_logs ───────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_table text NOT NULL,
  target_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ── 33. system_settings ──────────────────────────────────────
CREATE TABLE public.system_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ── 34. business_hours ───────────────────────────────────────
CREATE TABLE public.business_hours (
  weekday    int PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  open_time  time,
  close_time time,
  is_closed  boolean NOT NULL DEFAULT false
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- ── 35. holidays ─────────────────────────────────────────────
CREATE TABLE public.holidays (
  holiday_date date PRIMARY KEY,
  reason       text,
  is_closed    boolean NOT NULL DEFAULT true
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
