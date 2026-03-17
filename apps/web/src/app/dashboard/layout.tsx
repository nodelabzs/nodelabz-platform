import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTransition } from "./dashboard-transition";

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

  return <DashboardTransition>{children}</DashboardTransition>;
}
