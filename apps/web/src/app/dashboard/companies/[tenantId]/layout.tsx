import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";
import { prisma } from "@nodelabz/db";

export default async function CompanyTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  // Auth + superAdmin already verified by parent companies/layout.tsx
  // We just need the dbUser.id to set activeTenantId
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Parallelize: find user + validate tenant at the same time
  const [dbUser, tenant] = await Promise.all([
    findUserBySupabaseId(user.id),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    }),
  ]);

  if (!tenant) {
    notFound();
  }

  // Set activeTenantId
  if (dbUser && dbUser.activeTenantId !== tenantId) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { activeTenantId: tenantId },
    });
  }

  return <>{children}</>;
}
