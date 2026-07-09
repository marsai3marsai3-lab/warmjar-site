"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardPlus, Clock, Users } from "lucide-react";

const TABS = [
  { href: "/admin/calendar", label: "行事曆", icon: CalendarDays },
  { href: "/admin/schedule", label: "班表", icon: Clock },
  { href: "/admin/appointments/new", label: "建單", icon: ClipboardPlus },
  { href: "/admin/members", label: "會員", icon: Users },
];

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-cream-border bg-white">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              active ? "text-terracotta" : "text-ink-light"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
