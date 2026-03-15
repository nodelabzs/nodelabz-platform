import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgShell } from "./org-shell";

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return <OrgShell userName={displayName}>{children}</OrgShell>;
}
