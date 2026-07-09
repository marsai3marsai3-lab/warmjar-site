import { requireAdminUser } from "@/lib/admin/auth";
import { AdminTabBar } from "@/components/admin/AdminTabBar";

export default async function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser();

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="sticky top-0 z-30 bg-terracotta px-4 py-2.5 text-center text-sm font-medium text-cream">
        溫罐子後台
      </div>
      <main>{children}</main>
      <AdminTabBar />
    </div>
  );
}
