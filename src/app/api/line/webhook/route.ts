import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineCoreConfig } from "@/lib/line/lineConfig";
import { verifyLineSignature } from "@/lib/line/webhookSignature";

type LineEvent = {
  type: string;
  source?: { userId?: string };
};

/**
 * 本輪只處理 follow/unfollow，message 事件收到直接回 200 但不做任何
 * 自動回覆邏輯——避免範圍蔓延到「客服機器人」（見草案 D.1）。
 * unfollow 必須處理：封鎖後 push 一定失敗，記下來讓 sendNotification
 * 之後直接 skip，不要每次都打一次注定失敗的 API。
 */
export async function POST(request: Request) {
  const config = getLineCoreConfig();
  if (!config) return new NextResponse("config error", { status: 500 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature, config.channelSecret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  const supabase = createAdminClient();

  for (const event of payload.events ?? []) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === "unfollow") {
      await supabase.from("profiles").update({ line_notify_blocked: true }).eq("line_user_id", lineUserId);
    } else if (event.type === "follow") {
      await supabase.from("profiles").update({ line_notify_blocked: false }).eq("line_user_id", lineUserId);
    }
  }

  return NextResponse.json({});
}
