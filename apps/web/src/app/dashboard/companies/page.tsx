import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";
import { prisma } from "@nodelabz/db";
import { CompaniesShell } from "./companies-shell";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Clear activeTenantId server-side
  const dbUser = await findUserBySupabaseId(user.id);
  if (dbUser?.activeTenantId) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { activeTenantId: null },
    });
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return <CompaniesShell userName={displayName} />;
}
