/**
 * Phase 3-3 第一刀 owner/manager 分流的單一判斷來源。requireOwnerForAction
 * （src/lib/admin/auth.ts）跟前端要不要渲染 owner 限定控制項都呼叫這個，
 * 不要各自重複寫 role === 'owner'。
 */
export function isOwnerRole(role: string): boolean {
  return role === "owner";
}
