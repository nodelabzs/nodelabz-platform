import { router, publicProcedure, protectedProcedure } from "../init";
import { findUserBySupabaseId } from "@/server/auth/provision";

export const authRouter = router({
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return { user: null, tenant: null };
    }

    const dbUser = await findUserBySupabaseId(ctx.user.id);
    if (!dbUser) {
      return { user: null, tenant: null };
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.role.name,
        permissions: dbUser.role.permissions,
        isSuperAdmin: dbUser.isSuperAdmin,
        activeTenantId: dbUser.activeTenantId,
      },
      tenant: {
        id: dbUser.tenant.id,
        name: dbUser.tenant.name,
        slug: dbUser.tenant.slug,
        plan: dbUser.tenant.plan,
        language: dbUser.tenant.language,
        trialEndsAt: dbUser.tenant.trialEndsAt,
      },
    };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.supabase.auth.signOut();
    return { success: true };
  }),
});
