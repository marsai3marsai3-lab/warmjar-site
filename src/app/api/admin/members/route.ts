import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { fetchMemberList, type MemberListFilters } from "@/lib/admin/memberData";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";

export async function GET(request: Request) {
  try {
    await requireAdminForAction();
  } catch {
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const filters: MemberListFilters = {
    search: params.get("search") ?? undefined,
    tagIds: params.get("tagIds") ? params.get("tagIds")!.split(",").filter(Boolean) : undefined,
    blacklistedOnly: params.get("blacklistedOnly") === "1",
    birthdayThisMonth: params.get("birthdayThisMonth") === "1",
    requiresDepositOnly: params.get("requiresDepositOnly") === "1",
    hasNoShowHistory: params.get("hasNoShowHistory") === "1",
    hasStoredValueBalance: params.get("hasStoredValueBalance") === "1",
  };

  const supabase = createAdminClient();

  try {
    const members = await fetchMemberList(supabase, filters, taipeiTodayISO());
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
  }
}
