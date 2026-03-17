import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/app/dashboard/dashboard-content";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage() {
  // Auth already verified by parent layouts — just need the user object for DashboardContent
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <DashboardContent user={user} />;
}
