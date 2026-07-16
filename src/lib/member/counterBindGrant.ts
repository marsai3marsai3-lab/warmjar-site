import { signToken, verifyToken } from "@/lib/booking/signedToken";

// 短效（10 分鐘）+ 物理交付（QR/深連結遞給站在櫃檯前的客人）是第一層
// 防護；單次失效則靠 bindLineUserIdToCustomer 消費 grant 時對
// profiles.line_user_id / customers.profile_id 做條件式 UPDATE（見
// docs/phase-7a-early-launch-draft.md §4.3「單次失效設計」），不是靠
// 這個 token 本身的黑名單機制——同一份 token 在效期內被重複呼叫，是否
// 真的成功綁定由那支 helper 的原子更新決定，不是這裡擋。
export const COUNTER_BIND_GRANT_TTL_MS = 10 * 60 * 1000;

type CounterBindGrantPayload = {
  kind: "counter_bind_grant";
  customerId: string;
  issuedBy: string;
  expiresAt: number;
};

export function createCounterBindGrant(
  customerId: string,
  issuedBy: string,
  secret: string,
  now: Date = new Date()
): { token: string; expiresAt: number } {
  const expiresAt = now.getTime() + COUNTER_BIND_GRANT_TTL_MS;
  const payload: CounterBindGrantPayload = { kind: "counter_bind_grant", customerId, issuedBy, expiresAt };
  return { token: signToken(payload, secret), expiresAt };
}

export function verifyCounterBindGrant(
  token: string,
  secret: string,
  now: Date = new Date()
): { customerId: string; issuedBy: string } | null {
  const payload = verifyToken<CounterBindGrantPayload>(token, secret);
  if (!payload || payload.kind !== "counter_bind_grant") return null;
  if (payload.expiresAt <= now.getTime()) return null;
  return { customerId: payload.customerId, issuedBy: payload.issuedBy };
}
