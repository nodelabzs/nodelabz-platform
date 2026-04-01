import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

export async function createTRPCContext({ req }: { req: Request }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user,
    supabase,
  };
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

export const router = t.router;
export const publicProcedure = t.procedure;

// Layer 1: Basic auth check (Supabase user exists)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Layer 2: Tenant-scoped procedure (resolves dbUser + effectiveTenantId)
export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const dbUser = await findUserBySupabaseId(ctx.user.id);
  if (!dbUser) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not provisioned" });
  }

  // Super Admin: use activeTenantId if set, otherwise their home tenant
  const effectiveTenantId = dbUser.isSuperAdmin && dbUser.activeTenantId
    ? dbUser.activeTenantId
    : dbUser.tenantId;

  // Check trial expiration using already-fetched tenant data (no extra query)
  const trialExpired = !!(
    dbUser.tenant.plan === "INICIO" &&
    dbUser.tenant.trialEndsAt &&
    new Date() > dbUser.tenant.trialEndsAt
  );

  return next({
    ctx: {
      ...ctx,
      dbUser,
      effectiveTenantId,
      trialExpired,
    },
  });
});

// Layer 3: Super Admin only
export const superAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const dbUser = await findUserBySupabaseId(ctx.user.id);
  if (!dbUser) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not provisioned" });
  }
  if (!dbUser.isSuperAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
  }

  return next({
    ctx: {
      ...ctx,
      dbUser,
      effectiveTenantId: dbUser.activeTenantId ?? dbUser.tenantId,
    },
  });
});
