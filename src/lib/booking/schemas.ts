import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^09\d{8}$/, "請輸入正確的台灣手機號碼（09 開頭共 10 碼）");

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "驗證碼為 6 碼數字");

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式錯誤");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "時間格式錯誤");

export const availabilityRequestSchema = z.object({
  serviceVariantIds: z.array(z.string().uuid()).min(1, "請至少選擇一項服務"),
  staffId: z.string().uuid().optional(),
  dateRange: z.object({ startDate: dateSchema, endDate: dateSchema }),
});

export const sendOtpRequestSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpRequestSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

export const createAppointmentRequestSchema = z.object({
  serviceVariantIds: z.array(z.string().uuid()).min(1, "請至少選擇一項服務"),
  staffId: z.string().uuid().optional(),
  date: dateSchema,
  startTime: timeSchema,
  customerName: z.string().trim().min(1, "請輸入姓名").max(50),
  customerPhone: phoneSchema,
  customerNote: z.string().trim().max(300).optional(),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;
