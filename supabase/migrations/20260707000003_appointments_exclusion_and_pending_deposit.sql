-- ============================================================
-- 溫罐子預約管理系統 — Phase 2 修正：appointments 防重疊 EXCLUDE
-- 約束 + pending_deposit（定金保留）狀態
-- 日期：2026-07-07
-- ============================================================
--
-- 背景：schema-draft.md 原本要求在 appointments 加一個 EXCLUDE 約束
-- 作為「DB 層最後防線」，但 0001_init_schema.sql 實際只建了一個普通
-- GiST 索引（appointments_staff_tsrange_idx），並沒有真正的 EXCLUDE
-- 約束 —— 代表兩個併發請求目前可以同時把同一位師傅、同一時段都寫
-- 進去，DB 完全不會擋。這支 migration 補上真正的約束。
--
-- 同時補上 availability.ts 已經在用、但 DB 還沒有的 pending_deposit
-- 狀態與 expires_at 欄位（定金未付前的暫時佔位，逾時應釋放）。

-- ── 1. 補上 pending_deposit 狀態與 expires_at 欄位 ─────────────
ALTER TABLE public.appointments
  ADD COLUMN expires_at timestamptz;

ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_status_check,
  ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending','confirmed','completed','cancelled','no_show','pending_deposit'));

-- 供未來 lazy-expire 清理過期 pending_deposit 用的查詢索引
CREATE INDEX idx_appointments_pending_deposit_expiry
  ON public.appointments (expires_at)
  WHERE status = 'pending_deposit';

-- ── 2. 移除舊的普通索引，改用真正的 EXCLUDE 約束 ────────────────
--
-- 設計決策：EXCLUDE 約束的 WHERE 條件只能用 IMMUTABLE 判斷式，不能
-- 呼叫 now() 動態排除「已過期的 pending_deposit」。因此這裡採取保守
-- （fail-safe）做法：只要 status 不是 cancelled/no_show，一律視為
-- 佔位，包含尚未被清理的過期 pending_deposit —— DB 寧可誤擋、不可
-- 誤放，避免真正的重複預約。
--
-- 過期的 pending_deposit 要真正「讓出」時段，靠應用層主動把狀態改
-- 成 cancelled（例如背景 cron 或下一次寫入前的 lazy expire 步驟），
-- 而不是靠約束本身動態忽略它。calculateAvailability() 純函式那邊用
-- expiresAt 判斷是否顯示為可預約，是給「查詢/顯示」用的樂觀判斷；
-- 真正「寫入」時仍以 DB 約束為準，兩者用途不同、有意分開。Phase 2B
-- 實作真正的 Supabase repo 時，insertAppointment 應該先做一次 lazy
-- expire（UPDATE 過期的 pending_deposit 為 cancelled）再嘗試
-- INSERT，否則使用者可能會被過期但尚未清除的暫留擋下。
DROP INDEX IF EXISTS public.appointments_staff_tsrange_idx;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_staff_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  )
  WHERE (staff_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'));

-- ── 3. rooms／resources：本次不加同款約束 ───────────────────────
--
-- 設計決策：rooms.capacity 允許 > 1（非一對一佔用），EXCLUDE 約束
-- 本質是布林互斥，無法表達「同時最多 N 筆」；要做到需要另外寫
-- trigger 逐筆 COUNT，複雜度與現有以純函式（resourceCapacities）在
-- 應用層計算空間佔用的設計重複。CLAUDE.md 與 schema-draft.md 也都
-- 只點名師傅時段重疊是「最容易出錯的核心」，沒有要求房間層 DB 約
-- 束。因此房間／資源容量檢查維持在 availability.ts 的純函式層處
-- 理，不在此 migration 加 DB 約束。若未來房間固定都是 capacity=1
-- 且出現真的房間重複預約事故，再回頭評估針對 capacity=1 房間加
-- partial EXCLUDE 約束。
