import { describe, expect, it } from "vitest";
import {
  createAppointmentSafe,
  type AppointmentRepository,
  type CreateAppointmentPayload,
} from "./createAppointment";

describe("createAppointmentSafe", () => {
  it("13) 並發同時段：後者被 DB exclusion 擋下時回傳友善衝突訊息，不拋 500", async () => {
    const occupied = new Set<string>();

    const repo: AppointmentRepository = {
      async insertAppointment(payload: CreateAppointmentPayload) {
        const key = `${payload.staffId}_${payload.date}_${payload.startTime}_${payload.endTime}`;
        if (occupied.has(key)) {
          throw {
            code: "23P01",
            message: "conflicting key value violates exclusion constraint",
          };
        }
        occupied.add(key);
        return { id: `ap_${occupied.size}` };
      },
    };

    const payload: CreateAppointmentPayload = {
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    };

    const [r1, r2] = await Promise.all([
      createAppointmentSafe(repo, payload),
      createAppointmentSafe(repo, payload),
    ]);

    const success = [r1, r2].find((r) => r.ok);
    const failed = [r1, r2].find((r) => !r.ok);

    expect(success?.ok).toBe(true);
    expect(failed).toEqual({
      ok: false,
      code: "SLOT_ALREADY_BOOKED",
      message: "此時段剛被預約，請重新選擇",
      httpStatus: 409,
    });
  });

  it("14) 併發 GiST 索引寫入偵測為 deadlock（40P01）而非乾淨的 23P01 時，重試一次後成功應視為建立成功", async () => {
    let calls = 0;
    const repo: AppointmentRepository = {
      async insertAppointment() {
        calls += 1;
        if (calls === 1) {
          throw { code: "40P01", message: "deadlock detected" };
        }
        return { id: "ap_retry_success" };
      },
    };

    const result = await createAppointmentSafe(repo, {
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(calls).toBe(2);
    expect(result).toEqual({ ok: true, appointmentId: "ap_retry_success" });
  });

  it("15) deadlock 重試後仍衝突（23P01）應回傳友善 409，而不是重試第二次", async () => {
    let calls = 0;
    const repo: AppointmentRepository = {
      async insertAppointment() {
        calls += 1;
        if (calls === 1) {
          throw { code: "40P01", message: "deadlock detected" };
        }
        throw {
          code: "23P01",
          message: "conflicting key value violates exclusion constraint",
        };
      },
    };

    const result = await createAppointmentSafe(repo, {
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(calls).toBe(2);
    expect(result).toEqual({
      ok: false,
      code: "SLOT_ALREADY_BOOKED",
      message: "此時段剛被預約，請重新選擇",
      httpStatus: 409,
    });
  });
});
