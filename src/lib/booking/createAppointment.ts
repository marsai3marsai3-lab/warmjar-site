export type CreateAppointmentPayload = {
  customerId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type AppointmentRepository = {
  insertAppointment: (payload: CreateAppointmentPayload) => Promise<{ id: string }>;
};

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string }
  | {
      ok: false;
      code: "SLOT_ALREADY_BOOKED" | "UNKNOWN";
      message: string;
      httpStatus: number;
    };

function isExclusionConflictError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "23P01") return true;
  const msg = e.message?.toLowerCase() ?? "";
  return msg.includes("exclusion constraint") || msg.includes("conflicting key value");
}

export async function createAppointmentSafe(
  repo: AppointmentRepository,
  payload: CreateAppointmentPayload
): Promise<CreateAppointmentResult> {
  try {
    const inserted = await repo.insertAppointment(payload);
    return { ok: true, appointmentId: inserted.id };
  } catch (err) {
    if (isExclusionConflictError(err)) {
      return {
        ok: false,
        code: "SLOT_ALREADY_BOOKED",
        message: "此時段剛被預約，請重新選擇",
        httpStatus: 409,
      };
    }

    return {
      ok: false,
      code: "UNKNOWN",
      message: "預約建立失敗，請稍後再試",
      httpStatus: 500,
    };
  }
}
