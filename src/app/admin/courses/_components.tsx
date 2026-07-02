"use client";

import { useState, useTransition } from "react";
import { grantEnrollment, revokeEnrollment } from "./_actions";

type Course = { slug: { current: string } | string; title?: string };

type GrantProps = {
  userId: string;
  courses: Course[];
  mode?: "grant";
  enrollmentId?: undefined;
};

type RevokeProps = {
  userId: string;
  courses: Course[];
  mode: "revoke";
  enrollmentId: string;
};

type Props = GrantProps | RevokeProps;

export function AdminActions(props: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedSlug, setSelectedSlug] = useState("");
  const [message, setMessage] = useState("");

  if (props.mode === "revoke") {
    return (
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await revokeEnrollment(props.enrollmentId);
              setMessage("已停用");
            } catch (e) {
              setMessage(String(e));
            }
          })
        }
        className="text-xs text-red-400 hover:text-red-600 transition disabled:opacity-40"
      >
        {isPending ? "停用中…" : "停用"}
      </button>
    );
  }

  function getSlug(course: Course): string {
    if (typeof course.slug === "string") return course.slug;
    return course.slug?.current ?? "";
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selectedSlug}
        onChange={(e) => setSelectedSlug(e.target.value)}
        className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 text-ink focus:outline-none"
      >
        <option value="">選擇課程…</option>
        {props.courses.map((c) => (
          <option key={getSlug(c)} value={getSlug(c)}>
            {c.title ?? getSlug(c)}
          </option>
        ))}
      </select>
      <button
        disabled={isPending || !selectedSlug}
        onClick={() =>
          startTransition(async () => {
            try {
              await grantEnrollment(props.userId, selectedSlug);
              setMessage("✓ 已授予");
              setSelectedSlug("");
            } catch (e) {
              setMessage(String(e));
            }
          })
        }
        className="text-xs bg-olive text-cream px-3 py-1.5 rounded-lg hover:bg-olive/90 transition disabled:opacity-40"
      >
        {isPending ? "授予中…" : "授予觀看權限"}
      </button>
      {message && (
        <span className="text-xs text-ink/50">{message}</span>
      )}
    </div>
  );
}
