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

function isDeadlockError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as { code?: string }).code === "40P01";
}

function isExclusionConflictError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  // 40P01 is included here as a fallback for the (very unlikely) case the retry
  // below also deadlocks: two concurrent inserts racing the same EXCLUDE-
  // constrained GiST index can raise "deadlock detected" instead of a clean
  // exclusion violation, verified against a real concurrent write to Supabase.
  if (e.code === "23P01" || e.code === "40P01") return true;
  const msg = e.message?.toLowerCase() ?? "";
  return msg.includes("exclusion constraint") || msg.includes("conflicting key value");
}

export async function createAppointmentSafe(
  repo: AppointmentRepository,
  payload: CreateAppointmentPayload,
  retryOnDeadlock = true
): Promise<CreateAppointmentResult> {
  try {
    const inserted = await repo.insertAppointment(payload);
    return { ok: true, appointmentId: inserted.id };
  } catch (err) {
    if (retryOnDeadlock && isDeadlockError(err)) {
      return createAppointmentSafe(repo, payload, false);
    }

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

export type MultiServiceSlot = {
  serviceVariantId: string;
  startTime: string;
  endTime: string;
};

export type CreateMultiServiceResult =
  | { ok: true; appointmentIds: string[] }
  | {
      ok: false;
      code: "SLOT_ALREADY_BOOKED" | "UNKNOWN";
      message: string;
      httpStatus: number;
    };

/**
 * A multi-service booking (e.g. 60min + 30min back-to-back) writes one
 * appointments row per service_variant_id. Each row is its own EXCLUDE-
 * protected insert, so this isn't one atomic DB transaction — if a later
 * slot in the sequence loses a race (e.g. someone else grabbed the tail end
 * of the block a moment earlier), we compensate by cancelling whatever we
 * already created for this booking rather than leaving orphaned appointments.
 */
export async function createMultiServiceAppointments(
  makeRepo: (serviceVariantId: string) => AppointmentRepository,
  cancelAppointment: (appointmentId: string) => Promise<void>,
  base: { customerId: string; staffId: string; date: string },
  slots: MultiServiceSlot[]
): Promise<CreateMultiServiceResult> {
  const createdIds: string[] = [];

  for (const slot of slots) {
    const repo = makeRepo(slot.serviceVariantId);
    const result = await createAppointmentSafe(repo, {
      customerId: base.customerId,
      staffId: base.staffId,
      date: base.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    if (!result.ok) {
      for (const id of createdIds) {
        await cancelAppointment(id).catch(() => {});
      }
      return result;
    }

    createdIds.push(result.appointmentId);
  }

  return { ok: true, appointmentIds: createdIds };
}
