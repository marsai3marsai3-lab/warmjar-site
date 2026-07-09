import { requireAdminUser } from "@/lib/admin/auth";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import { AdminAccountMenu } from "@/components/admin/AdminAccountMenu";

export default async function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireAdminUser();

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="sticky top-0 z-30 flex items-center justify-center bg-terracotta px-4 py-2 text-sm font-medium text-cream">
        <span>溫罐子後台</span>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <AdminAccountMenu displayName={profile.displayName} email={user.email ?? ""} role={profile.role} />
        </div>
      </div>
      <main>{children}</main>
      <AdminTabBar />
    </div>
  );
}
