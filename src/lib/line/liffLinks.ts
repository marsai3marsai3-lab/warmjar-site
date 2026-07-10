// LIFF 深連結（https://liff.line.me/{LIFF_ID}/path）在 LINE 內開啟時會
// 進到真正的 LIFF context（能拿 idToken），一般 https 連結在 LINE 聊天室
// 點開只會是 in-app browser，不會重新走 LIFF 登入流程——推播訊息裡的
// 按鈕一律要用這個格式，不能直接連官網網址。沒設定 LIFF ID 時（例如
// 本機開發還沒申請）退回一般網址，至少連結還能點得動。
function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.warmjar.com.tw";
}

function buildLiffUrl(path: string): string | null {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;
  return `https://liff.line.me/${liffId}${path}`;
}

export function buildMemberUrl(): string {
  return buildLiffUrl("/member") ?? `${siteBaseUrl()}/member`;
}

export function buildBookingUrl(): string {
  return buildLiffUrl("/book") ?? `${siteBaseUrl()}/book`;
}

// 訂金付款連結不是 LIFF 頁面，是既有 /api/book/ecpay/checkout 這支一般
// GET 端點（見該路由：帶 merchantTradeNo 直接自動送出到綠界），從 LINE
// 訊息裡的一般連結點開就能用，不需要 LIFF context。
export function buildDepositPaymentUrl(merchantTradeNo: string): string {
  return `${siteBaseUrl()}/api/book/ecpay/checkout?merchantTradeNo=${encodeURIComponent(merchantTradeNo)}`;
}
