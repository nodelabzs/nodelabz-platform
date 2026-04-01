import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const tenantRouter = router({
  /** Get tenant details */
  get: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        companySize: true,
        plan: true,
        language: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant no encontrado" });
    }

    return tenant;
  }),

  /** Update tenant details (Admin only) */
  update: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        industry: z.string().max(100).optional(),
        companySize: z.string().max(50).optional(),
        language: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role.name !== "Admin" && !ctx.dbUser.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden actualizar la configuración",
        });
      }

      const data: Record<string, string> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.industry !== undefined) data.industry = input.industry;
      if (input.companySize !== undefined) data.companySize = input.companySize;
      if (input.language !== undefined) data.language = input.language;

      if (Object.keys(data).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se proporcionaron campos para actualizar",
        });
      }

      const updated = await prisma.tenant.update({
        where: { id: ctx.effectiveTenantId },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          companySize: true,
          plan: true,
          language: true,
        },
      });

      return updated;
    }),
});
