export type LineConfig = {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};

export function getLineConfig(): LineConfig | null {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelId || !channelSecret || !channelAccessToken) return null;
  return { channelId, channelSecret, channelAccessToken };
}
