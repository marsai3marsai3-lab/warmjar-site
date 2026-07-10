import { z } from "zod";
import { phoneSchema } from "@/lib/booking/schemas";

export const liffBindRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const liffCompleteBindRequestSchema = z.object({
  idToken: z.string().min(1),
  phone: phoneSchema,
});

export const memberProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, "請輸入姓名").max(50),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  email: z.string().trim().email("Email 格式錯誤").nullable().optional(),
});
