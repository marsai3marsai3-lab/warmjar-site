"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction, requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateMemberProfile(
  customerId: string,
  input: { name: string; birthday?: string | null; internalNote?: string | null }
): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const current = await supabase
      .from("customers")
      .select("name, birthday, internal_note")
      .eq("id", customerId)
      .maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const { error } = await supabase
      .from("customers")
      .update({ name: input.name, birthday: input.birthday ?? null, internal_note: input.internalNote ?? null })
      .eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.update_profile",
      targetTable: "customers",
      targetId: customerId,
      before: current.data,
      after: input,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function createTag(name: string, color?: string): Promise<
  { ok: true; tag: { id: string; name: string; color: string | null } } | { ok: false; error: string }
> {
  try {
    await requireAdminForAction();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tags")
      .insert({ name, color: color ?? null })
      .select("id, name, color")
      .single();
    if (error) return { ok: false, error: "建立標籤失敗，可能已存在同名標籤" };

    return { ok: true, tag: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function setCustomerTags(customerId: string, tagIds: string[]): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // replace-on-save，跟 saveRecurringSchedule 同一套模式：先刪再插，
    // 讓「目前這個客人身上有哪些標籤」永遠等於呼叫端傳進來的集合。
    const del = await supabase.from("customer_tags").delete().eq("customer_id", customerId);
    if (del.error) return { ok: false, error: "更新失敗，請稍後再試" };

    if (tagIds.length > 0) {
      const ins = await supabase
        .from("customer_tags")
        .insert(tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId })));
      if (ins.error) return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.set_tags",
      targetTable: "customers",
      targetId: customerId,
      after: { tagIds },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function addMemberNote(customerId: string, note: string): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // photo_urls 固定寫空陣列——照片上傳這階段只做 UI 占位，見
    // docs/phase-3-3-members-draft.md E.1 與 docs/design-log.md
    // 2026-07-11 決策（綁定 Phase 6 電子同意書機制才開放）。
    const { error } = await supabase
      .from("member_notes")
      .insert({ customer_id: customerId, author_id: profile.id, note, photo_urls: [] });
    if (error) return { ok: false, error: "新增筆記失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.add_note",
      targetTable: "member_notes",
      targetId: customerId,
      after: { note },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function toggleBlacklist(customerId: string, blacklisted: boolean): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    const current = await supabase.from("customers").select("status").eq("id", customerId).maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const nextStatus = blacklisted ? "blacklisted" : "active";
    const { error } = await supabase.from("customers").update({ status: nextStatus }).eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.toggle_blacklist",
      targetTable: "customers",
      targetId: customerId,
      before: { status: current.data.status },
      after: { status: nextStatus },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function updateMemberRating(customerId: string, rating: number | null): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    if (rating !== null && (rating < 1 || rating > 5)) {
      return { ok: false, error: "評分必須介於 1 到 5" };
    }

    const current = await supabase.from("customers").select("rating").eq("id", customerId).maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const { error } = await supabase.from("customers").update({ rating }).eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.update_rating",
      targetTable: "customers",
      targetId: customerId,
      before: { rating: current.data.rating },
      after: { rating },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
