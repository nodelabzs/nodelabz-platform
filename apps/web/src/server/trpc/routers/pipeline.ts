import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const pipelineRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.pipeline.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }),

  get: tenantProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await prisma.pipeline.findFirst({
        where: { id: input.pipelineId, tenantId: ctx.effectiveTenantId },
      });

      if (!pipeline) throw new TRPCError({ code: "NOT_FOUND" });

      // Count deals grouped by stageId
      const dealStats = await prisma.deal.groupBy({
        by: ["stageId"],
        where: { pipelineId: input.pipelineId, tenantId: ctx.effectiveTenantId },
        _count: { id: true },
        _sum: { value: true },
      });

      const stageStats = dealStats.map((s) => ({
        stageId: s.stageId,
        count: s._count.id,
        totalValue: s._sum.value?.toNumber() ?? 0,
      }));

      return { ...pipeline, stageStats };
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string(),
        stages: z.array(
          z.object({
            name: z.string(),
            color: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stages = input.stages.map((stage, index) => ({
        id: stage.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        name: stage.name,
        order: index,
        color: stage.color,
      }));

      return prisma.pipeline.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          stages: stages as object,
        },
      });
    }),

  update: tenantProcedure
    .input(
      z.object({
        pipelineId: z.string().uuid(),
        name: z.string().optional(),
        stages: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              order: z.number(),
              color: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pipeline = await prisma.pipeline.findFirst({
        where: { id: input.pipelineId, tenantId: ctx.effectiveTenantId },
      });

      if (!pipeline) throw new TRPCError({ code: "NOT_FOUND" });

      const { pipelineId, ...updateData } = input;
      return prisma.pipeline.update({
        where: { id: pipelineId },
        data: updateData as object,
      });
    }),

  delete: tenantProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await prisma.pipeline.findFirst({
        where: { id: input.pipelineId, tenantId: ctx.effectiveTenantId },
      });

      if (!pipeline) throw new TRPCError({ code: "NOT_FOUND" });

      if (pipeline.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete the default pipeline",
        });
      }

      await prisma.pipeline.delete({ where: { id: input.pipelineId } });
      return { success: true };
    }),
});
