import { z } from "zod";
import { router, superAdminProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const superadminRouter = router({
  listTenants: superAdminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, search } = input ?? {};
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { users: true } },
          },
        }),
        prisma.tenant.count({ where }),
      ]);

      return {
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          userCount: t._count.users,
          trialEndsAt: t.trialEndsAt,
          createdAt: t.createdAt,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getTenantDetail: superAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: input.tenantId },
        include: {
          users: {
            include: { role: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              contacts: true,
              deals: true,
              workflows: true,
              conversations: true,
              emailCampaigns: true,
            },
          },
        },
      });

      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        ...tenant,
        users: tenant.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role.name,
          isSuperAdmin: u.isSuperAdmin,
          createdAt: u.createdAt,
        })),
        stats: tenant._count,
      };
    }),

  setActiveTenant: superAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: input.tenantId },
      });
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      // Set active tenant on user
      await prisma.user.update({
        where: { id: ctx.dbUser.id },
        data: { activeTenantId: input.tenantId },
      });

      // Log the action
      await prisma.platformAuditLog.create({
        data: {
          userId: ctx.dbUser.id,
          action: "enter_tenant",
          targetType: "tenant",
          targetId: input.tenantId,
          metadata: { tenantName: tenant.name },
        },
      });

      return { tenant };
    }),

  exitTenant: superAdminProcedure.mutation(async ({ ctx }) => {
    await prisma.user.update({
      where: { id: ctx.dbUser.id },
      data: { activeTenantId: null },
    });

    await prisma.platformAuditLog.create({
      data: {
        userId: ctx.dbUser.id,
        action: "exit_tenant",
        targetType: "tenant",
        targetId: ctx.dbUser.activeTenantId,
      },
    });

    return { success: true };
  }),

  getAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        action: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 50, action, startDate, endDate } = input ?? {};
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        };
      }

      const [logs, total] = await Promise.all([
        prisma.platformAuditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.platformAuditLog.count({ where }),
      ]);

      return { logs, total, page, totalPages: Math.ceil(total / limit) };
    }),

  getPlatformStats: superAdminProcedure.query(async () => {
    const [totalTenants, totalUsers, activeTenants, trialTenants] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.tenant.count({
          where: {
            users: { some: {} },
          },
        }),
        prisma.tenant.count({
          where: {
            trialEndsAt: { gte: new Date() },
          },
        }),
      ]);

    // Plan distribution
    const planDistribution = await prisma.tenant.groupBy({
      by: ["plan"],
      _count: { plan: true },
    });

    return {
      totalTenants,
      totalUsers,
      activeTenants,
      trialTenants,
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count.plan,
      })),
    };
  }),

  updateTenantPlan: superAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        plan: z.enum(["INICIO", "CRECIMIENTO", "PROFESIONAL", "AGENCIA"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.update({
        where: { id: input.tenantId },
        data: { plan: input.plan },
      });

      await prisma.platformAuditLog.create({
        data: {
          userId: ctx.dbUser.id,
          action: "plan_changed",
          targetType: "tenant",
          targetId: input.tenantId,
          metadata: { newPlan: input.plan, tenantName: tenant.name },
        },
      });

      return tenant;
    }),
});
