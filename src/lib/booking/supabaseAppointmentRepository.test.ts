import { describe, expect, it, vi } from "vitest";
import { createAppointmentRepository } from "./supabaseAppointmentRepository";
import type { AppointmentSqlClient } from "./appointmentSqlClient";

function makeClient(overrides: Partial<AppointmentSqlClient> = {}): {
  client: AppointmentSqlClient;
  calls: string[];
} {
  const calls: string[] = [];
  const client: AppointmentSqlClient = {
    expireStalePendingDeposits: vi.fn(async () => {
      calls.push("expire");
    }),
    insertAppointmentRow: vi.fn(async () => {
      calls.push("insert");
      return { id: "ap_1" };
    }),
    cancelAppointment: vi.fn(async () => {
      calls.push("cancel");
    }),
    ...overrides,
  };
  return { client, calls };
}

describe("createAppointmentRepository", () => {
  it("19) 寫入前一定先執行 lazy-expire，再嘗試 INSERT", async () => {
    const { client, calls } = makeClient();
    const repo = createAppointmentRepository(client, {
      serviceVariantId: "svc-1",
      source: "web",
      status: "pending_deposit",
      expiresAt: "2026-07-10T12:30:00.000Z",
    });

    await repo.insertAppointment({
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(calls).toEqual(["expire", "insert"]);
  });

  it("20) 把正確的 staff/date/時段轉發給 lazy-expire 查詢", async () => {
    const { client } = makeClient();
    const repo = createAppointmentRepository(client, {
      serviceVariantId: "svc-1",
      source: "web",
      status: "pending_deposit",
      expiresAt: null,
    });

    await repo.insertAppointment({
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(client.expireStalePendingDeposits).toHaveBeenCalledWith({
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });
  });

  it("21) 把 serviceVariantId/source/status/expiresAt 併入 INSERT 參數", async () => {
    const { client } = makeClient();
    const repo = createAppointmentRepository(client, {
      serviceVariantId: "svc-42",
      source: "web",
      status: "pending_deposit",
      expiresAt: "2026-07-10T12:30:00.000Z",
    });

    await repo.insertAppointment({
      customerId: "c1",
      staffId: "s1",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(client.insertAppointmentRow).toHaveBeenCalledWith({
      customerId: "c1",
      staffId: "s1",
      serviceVariantId: "svc-42",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "11:00",
      source: "web",
      status: "pending_deposit",
      expiresAt: "2026-07-10T12:30:00.000Z",
    });
  });

  it("22) 若 lazy-expire 本身失敗，不應該繼續嘗試 INSERT", async () => {
    const { client, calls } = makeClient({
      expireStalePendingDeposits: vi.fn(async () => {
        calls.push("expire");
        throw new Error("db unavailable");
      }),
    });
    const repo = createAppointmentRepository(client, {
      serviceVariantId: "svc-1",
      source: "web",
      status: "pending_deposit",
      expiresAt: null,
    });

    await expect(
      repo.insertAppointment({
        customerId: "c1",
        staffId: "s1",
        date: "2026-07-10",
        startTime: "10:00",
        endTime: "11:00",
      })
    ).rejects.toThrow("db unavailable");
    expect(calls).toEqual(["expire"]);
  });
});
