/**
 * 哪些路徑需要登入才能進——proxy.ts 的 middleware 用這個決定沒有
 * session 時要不要導去 /login，抽成獨立、可測試的純函式（原本直接寫在
 * proxy.ts 裡，middleware 本身因為要呼叫真的 Supabase 網路請求，不方便
 * 直接單元測試）。
 */
const PROTECTED_PATH_PATTERNS = [/^\/dashboard/, /^\/admin/, /^\/courses\/[^/]+\/[^/]+/];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}
