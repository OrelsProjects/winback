import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">{children}</main>
    </div>
  );
}
