import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

export default async function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const dbUser = await findUserBySupabaseId(user.id);

  if (!dbUser?.isSuperAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
