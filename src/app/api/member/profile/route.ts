import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberSession } from "@/lib/member/session";
import { memberProfileUpdateSchema } from "@/lib/member/schemas";

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "請重新登入" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("name, phone, birthday, email")
    .eq("id", session.customerId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });

  return NextResponse.json({ profile: data });
}

// 手機號碼不可自助修改——手機是綁定/OTP 驗證的錨點，改手機等同換身分
// （見草案 A.6），這支只允許改姓名/生日/email。
export async function PATCH(request: Request) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "請重新登入" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = memberProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請確認填寫內容" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      birthday: parsed.data.birthday ?? null,
      email: parsed.data.email ?? null,
    })
    .eq("id", session.customerId);
  if (error) return NextResponse.json({ error: "更新失敗，請稍後再試" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
