-- ============================================================
-- 溫罐子預約管理系統 — /book 本機測試用示範資料
-- 日期：2026-07-08
-- ============================================================
--
-- 這不是 migration（不改 schema），只是讓 Phase 2B 的 /book 預約
-- 流程在本機可以真的跑起來的示範資料：2 位示範師傅（全週
-- 10:00-22:00 常態班表，對應官網公告的營業時間）+ 2 項服務
-- （借用 /pricing 頁面上既有、已合規審查過的真實項目與價格，
-- 不臆造新名稱）。用 WHERE NOT EXISTS 保護，可重複執行不會產生
-- 重複資料。已直接對 warmjar-dev 執行過一次。

-- ── 師傅 1：陳師傅 ──────────────────────────────────────────
INSERT INTO public.profiles (id, role, display_name)
SELECT gen_random_uuid(), 'staff', '陳師傅'
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff WHERE name = '陳師傅'
);

INSERT INTO public.staff (id, profile_id, name, default_commission_rate)
SELECT gen_random_uuid(), p.id, '陳師傅', 40.00
FROM public.profiles p
WHERE p.display_name = '陳師傅'
  AND NOT EXISTS (SELECT 1 FROM public.staff WHERE name = '陳師傅');

-- ── 師傅 2：林師傅 ──────────────────────────────────────────
INSERT INTO public.profiles (id, role, display_name)
SELECT gen_random_uuid(), 'staff', '林師傅'
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff WHERE name = '林師傅'
);

INSERT INTO public.staff (id, profile_id, name, default_commission_rate)
SELECT gen_random_uuid(), p.id, '林師傅', 40.00
FROM public.profiles p
WHERE p.display_name = '林師傅'
  AND NOT EXISTS (SELECT 1 FROM public.staff WHERE name = '林師傅');

-- ── 兩位師傅皆為全週 10:00-22:00 常態班表 ─────────────────────
INSERT INTO public.staff_recurring_availability (staff_id, weekday, start_time, end_time)
SELECT s.id, weekday, '10:00', '22:00'
FROM public.staff s
CROSS JOIN generate_series(0, 6) AS weekday
WHERE s.name IN ('陳師傅', '林師傅')
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_recurring_availability r
    WHERE r.staff_id = s.id AND r.weekday = weekday
  );

-- ── 服務分類與項目（沿用 /pricing 既有合規文案與價格）──────────
INSERT INTO public.service_categories (id, name, sort_order)
SELECT gen_random_uuid(), '溫罐舒放', 1
WHERE NOT EXISTS (SELECT 1 FROM public.service_categories WHERE name = '溫罐舒放');

INSERT INTO public.services (id, category_id, name, description, compliance_reviewed, sort_order)
SELECT gen_random_uuid(), c.id, '肩背舒放', '溫罐搭配手技，放鬆肩頸背部', true, 1
FROM public.service_categories c
WHERE c.name = '溫罐舒放'
  AND NOT EXISTS (SELECT 1 FROM public.services WHERE name = '肩背舒放');

INSERT INTO public.services (id, category_id, name, description, compliance_reviewed, sort_order)
SELECT gen_random_uuid(), c.id, '全身全腿舒放', '溫罐搭配手技，全身及腿部保養放鬆', true, 2
FROM public.service_categories c
WHERE c.name = '溫罐舒放'
  AND NOT EXISTS (SELECT 1 FROM public.services WHERE name = '全身全腿舒放');

INSERT INTO public.service_variants (id, service_id, name, duration_minutes, face_value_price, sort_order)
SELECT gen_random_uuid(), sv.id, '60 分鐘', 60, 1280, 1
FROM public.services sv
WHERE sv.name = '肩背舒放'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_variants WHERE service_id = sv.id AND name = '60 分鐘'
  );

INSERT INTO public.service_variants (id, service_id, name, duration_minutes, face_value_price, sort_order)
SELECT gen_random_uuid(), sv.id, '120 分鐘', 120, 2280, 1
FROM public.services sv
WHERE sv.name = '全身全腿舒放'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_variants WHERE service_id = sv.id AND name = '120 分鐘'
  );

-- 刻意不建立 staff_service_skills 資料列：
-- availability.ts 的 canStaffPerformAllServices() 在整張表完全沒有
-- 資料時視為「未做技能限制、全員皆可服務」，示範資料不需要額外設定
-- 技能對照就能讓兩位師傅都能被排進所有服務。
