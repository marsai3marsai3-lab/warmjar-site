/**
 * 遞迴走過 message_templates.content 裡所有字串值，把 {{var}} 換成
 * vars 裡對應的值。找不到對應變數時換成空字串，不是保留 {{var}} 原樣
 * ——避免漏填變數時，客人收到的訊息出現一段看起來像故障的 {{xxx}}。
 */
export function renderTemplate<T>(content: T, vars: Record<string, string>): T {
  if (typeof content === "string") {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "") as unknown as T;
  }
  if (Array.isArray(content)) {
    return content.map((item) => renderTemplate(item, vars)) as unknown as T;
  }
  if (content !== null && typeof content === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      result[key] = value === null || value === undefined ? value : renderTemplate(value, vars);
    }
    return result as T;
  }
  return content;
}
