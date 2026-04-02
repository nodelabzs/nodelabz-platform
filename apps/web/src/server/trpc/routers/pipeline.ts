import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import { invokeModel } from "../../ai/router";

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

  updateWithAI: tenantProcedure
    .input(z.object({ instruction: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the default pipeline
      const pipeline = await prisma.pipeline.findFirst({
        where: { tenantId: ctx.effectiveTenantId, isDefault: true },
      });

      if (!pipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No default pipeline found",
        });
      }

      const currentStages = pipeline.stages as Array<{
        id: string;
        name: string;
        color: string;
        order: number;
      }>;

      // 2. Call AI to transform stages
      const systemPrompt = `You are a pipeline editor. Given the current pipeline stages and a user instruction, return ONLY the modified stages array as valid JSON. Each stage has: id (lowercase-slug), name, color (hex), order (number). Keep existing stages unless told to remove them. Do not include any explanation, markdown, or code fences — return ONLY the raw JSON array.`;

      const userMessage = `Current stages:\n${JSON.stringify(currentStages, null, 2)}\n\nInstruction: ${input.instruction}`;

      const aiResponse = await invokeModel({
        message: userMessage,
        systemPrompt,
        tier: "sonnet",
        maxTokens: 1024,
      });

      // 3. Parse AI response
      let newStages: Array<{
        id: string;
        name: string;
        color: string;
        order: number;
      }>;

      try {
        // Strip any markdown code fences if present
        const cleaned = aiResponse
          .replace(/```(?:json)?\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        newStages = JSON.parse(cleaned);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned invalid JSON. Please try rephrasing your instruction.",
        });
      }

      // 4. Validate structure
      if (!Array.isArray(newStages) || newStages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "AI returned an empty or invalid stages array.",
        });
      }

      for (const stage of newStages) {
        if (!stage.id || !stage.name || !stage.color || typeof stage.order !== "number") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid stage structure: ${JSON.stringify(stage)}`,
          });
        }
      }

      // 5. Update pipeline
      const updated = await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { stages: newStages as object },
      });

      return updated;
    }),
});
