import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const workflowRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.workflow.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { updatedAt: "desc" },
    });
  }),

  get: tenantProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findFirst({
        where: { id: input.workflowId, tenantId: ctx.effectiveTenantId },
      });

      if (!workflow) throw new TRPCError({ code: "NOT_FOUND" });
      return workflow;
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string(),
        trigger: z.any(),
        nodes: z.any(),
        edges: z.any(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.workflow.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          trigger: input.trigger as object,
          nodes: input.nodes as object,
          edges: input.edges as object,
          isActive: input.isActive ?? false,
        },
      });
    }),

  update: tenantProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        name: z.string().optional(),
        trigger: z.any().optional(),
        nodes: z.any().optional(),
        edges: z.any().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findFirst({
        where: { id: input.workflowId, tenantId: ctx.effectiveTenantId },
      });

      if (!workflow) throw new TRPCError({ code: "NOT_FOUND" });

      const { workflowId, ...updateData } = input;
      return prisma.workflow.update({
        where: { id: workflowId },
        data: updateData as object,
      });
    }),

  delete: tenantProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findFirst({
        where: { id: input.workflowId, tenantId: ctx.effectiveTenantId },
      });

      if (!workflow) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.workflow.delete({ where: { id: input.workflowId } });
      return { success: true };
    }),
});
