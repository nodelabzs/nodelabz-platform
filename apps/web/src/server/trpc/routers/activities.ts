import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const activitiesRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid().optional(),
        type: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
      };
      if (input.contactId) where.contactId = input.contactId;
      if (input.type) where.type = input.type;

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: true,
              },
            },
          },
        }),
        prisma.activity.count({ where }),
      ]);

      return {
        activities,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  create: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        type: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;
      // Verify contact belongs to this tenant
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId },
        select: { id: true },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });

      return prisma.activity.create({
        data: {
          tenantId,
          contactId: input.contactId,
          type: input.type,
          subject: input.subject,
          body: input.body,
          metadata: input.metadata as object | undefined,
          createdBy: ctx.dbUser.id,
        },
      });
    }),

  delete: tenantProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const activity = await prisma.activity.findFirst({
        where: { id: input.activityId, tenantId: ctx.effectiveTenantId },
      });

      if (!activity) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.activity.delete({ where: { id: input.activityId } });
      return { success: true };
    }),
});
