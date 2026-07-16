-- ============================================================
-- 溫罐子預約管理系統 — Phase 7-A：正式上線運維開關
-- 日期：2026-07-22
-- 對應 docs/phase-7a-early-launch-draft.md §4.2、§5.4
-- ============================================================
--
-- 兩把新的 system_settings key/value（沿用既有 notification_schedule
-- 的做法，不額外開表）：
--
-- 1. deposit_flow_enabled：Phase 7-A 上線時關閉整條訂金流程（§4.2）。
--    warmjar-booking-prod 是全新資料庫，evaluateDepositPolicy 本來就會
--    因為 no_history 天然回傳 requiresDeposit=false，但這個巧合會在
--    系統自己累積出第一筆 no_show／遲取消紀錄後失效——屆時若
--    ECPAY_ENV 仍是 staging，會把真實客人導向測試環境付款頁。這個開關
--    讓「訂金流程要不要啟用」變成明確、不依賴巧合狀態的判斷，正式金鑰
--    到位時才翻成 true（呼叫端的串接邏輯屬於 Wave 2 範圍，本檔案只負責
--    種子值，evaluateDepositPolicy 純函式本身不改）。
--
-- 2. push_enabled：上線後的緊急關閉開關（§5.4）。sendNotification 一開始
--    先檢查這個值，false 時直接記 skipped、不呼叫任何 LINE API，讓
--    /admin 出事時能秒停推播不用等重新部署（呼叫端串接屬於 Wave 2
--    範圍，本檔案只負責種子值）。
--
-- 兩者上線時的初始值不同：deposit_flow_enabled 預設關閉（訂金流程本輪
-- 不啟用），push_enabled 預設開啟（推播是這輪的核心功能，不該預設關閉）。

INSERT INTO public.system_settings (key, value) VALUES
  ('deposit_flow_enabled', 'false'::jsonb),
  ('push_enabled', 'true'::jsonb);
