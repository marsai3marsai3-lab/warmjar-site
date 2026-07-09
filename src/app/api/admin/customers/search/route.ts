import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";

const PHONE_MIN_LENGTH = 4;
const NAME_MIN_LENGTH = 2;
const RESULT_LIMIT = 10;

// Escape LIKE/ILIKE wildcard characters so a literal "%" or "_" typed by the
// clerk doesn't get interpreted as a pattern.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function GET(request: Request) {
  try {
    await requireAdminForAction();
  } catch {
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }

  const url = new URL(request.url);
  const field = url.searchParams.get("field");
  const q = (url.searchParams.get("q") ?? "").trim();

  const supabase = createAdminClient();

  if (field === "phone") {
    if (q.length < PHONE_MIN_LENGTH) return NextResponse.json({ customers: [] });
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone")
      .not("phone", "is", null)
      .like("phone", `${escapeLikePattern(q)}%`)
      .order("name")
      .limit(RESULT_LIMIT);
    if (error) return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
    return NextResponse.json({ customers: data ?? [] });
  }

  if (field === "name") {
    if (q.length < NAME_MIN_LENGTH) return NextResponse.json({ customers: [] });
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone")
      .not("phone", "is", null)
      .ilike("name", `%${escapeLikePattern(q)}%`)
      .order("name")
      .limit(RESULT_LIMIT);
    if (error) return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
    return NextResponse.json({ customers: data ?? [] });
  }

  return NextResponse.json({ error: "缺少查詢欄位" }, { status: 400 });
}
