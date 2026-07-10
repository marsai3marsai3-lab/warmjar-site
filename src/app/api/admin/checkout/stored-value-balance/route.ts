import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { fetchStoredValueAccount } from "@/lib/storedValue/storedValueData";

export async function GET(request: Request) {
  try {
    await requireAdminForAction();
  } catch {
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "缺少客人 ID" }, { status: 400 });

  const supabase = createAdminClient();

  try {
    const account = await fetchStoredValueAccount(supabase, customerId);
    return NextResponse.json({ balance: account });
  } catch {
    return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
  }
}
