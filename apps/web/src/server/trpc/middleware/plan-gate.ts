import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { PLAN_ORDER, type PlanName } from "@/server/stripe/plans";
import { tenantProcedure } from "../init";

/**
 * Creates a procedure that requires a minimum plan level.
 * Usage: requirePlan("CRECIMIENTO") returns a procedure that enforces
 * the tenant has at least CRECIMIENTO plan.
 */
export function requirePlan(minimumPlan: PlanName) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant no encontrado",
      });
    }

    const tenantPlanLevel =
      PLAN_ORDER[tenant.plan as PlanName] ?? PLAN_ORDER.INICIO;
    const requiredLevel = PLAN_ORDER[minimumPlan];

    if (tenantPlanLevel < requiredLevel) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requiere plan ${minimumPlan} o superior`,
      });
    }

    return next({ ctx });
  });
}

/** Requires at least CRECIMIENTO plan */
export const crecimientoProcedure = requirePlan("CRECIMIENTO");

/** Requires at least PROFESIONAL plan */
export const profesionalProcedure = requirePlan("PROFESIONAL");

/** Requires AGENCIA plan */
export const agenciaProcedure = requirePlan("AGENCIA");
