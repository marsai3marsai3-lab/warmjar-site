import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { fetchAvailableDeposit } from "@/lib/checkout/checkoutData";

export async function GET(request: Request) {
  try {
    await requireAdminForAction();
  } catch {
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }

  const url = new URL(request.url);
  const appointmentIds = (url.searchParams.get("appointmentIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const supabase = createAdminClient();

  try {
    const deposit = await fetchAvailableDeposit(supabase, appointmentIds);
    return NextResponse.json({ deposit });
  } catch {
    return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
  }
}
