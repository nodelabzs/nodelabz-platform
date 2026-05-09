import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

// ── Workflow node/edge schemas ────────────────────────────────────────────

// Workflow nodes/edges are flexible JSON objects from the visual builder.
// We validate they're arrays of objects with reasonable limits.
const workflowNodeSchema = z.record(z.string(), z.unknown());
const workflowEdgeSchema = z.record(z.string(), z.unknown());
const triggerSchema = z.record(z.string(), z.unknown());

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
        name: z.string().min(1).max(200),
        trigger: triggerSchema,
        nodes: z.array(workflowNodeSchema).max(100),
        edges: z.array(workflowEdgeSchema).max(200),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.workflow.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          trigger: JSON.parse(JSON.stringify(input.trigger)),
          nodes: JSON.parse(JSON.stringify(input.nodes)),
          edges: JSON.parse(JSON.stringify(input.edges)),
          isActive: input.isActive ?? false,
        },
      });
    }),

  update: tenantProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        trigger: triggerSchema.optional(),
        nodes: z.array(workflowNodeSchema).max(100).optional(),
        edges: z.array(workflowEdgeSchema).max(200).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findFirst({
        where: { id: input.workflowId, tenantId: ctx.effectiveTenantId },
      });

      if (!workflow) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.trigger !== undefined) data.trigger = JSON.parse(JSON.stringify(input.trigger));
      if (input.nodes !== undefined) data.nodes = JSON.parse(JSON.stringify(input.nodes));
      if (input.edges !== undefined) data.edges = JSON.parse(JSON.stringify(input.edges));
      if (input.isActive !== undefined) data.isActive = input.isActive;

      return prisma.workflow.update({
        where: { id: input.workflowId },
        data,
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
