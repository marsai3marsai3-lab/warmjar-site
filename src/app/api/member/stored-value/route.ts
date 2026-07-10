import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberSession } from "@/lib/member/session";
import { fetchStoredValueAccount, fetchStoredValueTransactions } from "@/lib/storedValue/storedValueData";

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "請重新登入" }, { status: 401 });

  const supabase = createAdminClient();
  const [account, transactions] = await Promise.all([
    fetchStoredValueAccount(supabase, session.customerId),
    fetchStoredValueTransactions(supabase, session.customerId),
  ]);

  return NextResponse.json({ account, transactions });
}
