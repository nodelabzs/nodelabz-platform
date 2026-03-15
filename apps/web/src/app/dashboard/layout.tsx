import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside className="w-64 border-r border-neutral-200 bg-white p-4">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-neutral-900">NodeLabz</h1>
        </div>
        <nav className="space-y-1">
          <a href="/dashboard" className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-900 bg-neutral-100">
            Dashboard
          </a>
          <a href="/dashboard/contacts" className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            Contactos
          </a>
          <a href="/dashboard/campaigns" className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            Campañas
          </a>
          <a href="/dashboard/integrations" className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            Integraciones
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
