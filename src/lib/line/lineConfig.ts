/**
 * 核心組態：只放 channelId／channelSecret 兩個「靜態、幾乎不會失敗」
 * 的值，access token 不在這裡——見 tokenManager.ts。舊版
 * getLineConfig() 把三者綁成同一個 all-or-nothing 物件，導致拿掉
 * LINE_CHANNEL_ACCESS_TOKEN 會連帶讓 idToken 驗證／webhook 簽章驗證
 * 一起判定「未設定」（docs/phase6-stage-split-review.md 落差 1）。
 */
export type LineCoreConfig = {
  channelId: string;
  channelSecret: string;
};

export function getLineCoreConfig(): LineCoreConfig | null {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) return null;
  return { channelId, channelSecret };
}

/**
 * LIFF idToken 驗證用的 audience（client_id）——LINE 平台改制後，LIFF app
 * 不能再掛在 Messaging API channel 底下，必須另建 LINE Login channel
 * 承載，idToken 的 aud 對應的也是這個 Login channel，不是 Messaging API
 * 的 channelId。跟 LineCoreConfig 分開存放，因為兩者是不同 channel、
 * 不同用途，硬綁在一起會重蹈 getLineConfig() all-or-nothing 的覆轍
 * （見 docs/phase6-stage-split-design.md §2.1、v2.2 平台變更因應）。
 */
export function getLineLoginChannelId(): string | null {
  return process.env.LINE_LOGIN_CHANNEL_ID || null;
}
