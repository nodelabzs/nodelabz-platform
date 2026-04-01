import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@nodelabz/db";
import { buildCsvString } from "./csv-utils";
import { fireTrigger } from "@/server/workflows/triggers";
import { notifyDealWon } from "@/server/notifications/notify";

export const dealsRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          pipelineId: z.string().uuid().optional(),
          stageId: z.string().optional(),
          contactId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return prisma.deal.findMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          ...(input?.pipelineId && { pipelineId: input.pipelineId }),
          ...(input?.stageId && { stageId: input.stageId }),
          ...(input?.contactId && { contactId: input.contactId }),
        },
        include: {
          contact: true,
          pipeline: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  get: tenantProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const deal = await prisma.deal.findFirst({
        where: { id: input.dealId, tenantId: ctx.effectiveTenantId },
        include: {
          contact: true,
          pipeline: true,
        },
      });

      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
      return deal;
    }),

  create: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        pipelineId: z.string().uuid(),
        title: z.string(),
        value: z.number().optional(),
        stageId: z.string(),
        probability: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deal = await prisma.deal.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          contactId: input.contactId,
          pipelineId: input.pipelineId,
          title: input.title,
          value: input.value != null ? new Prisma.Decimal(input.value) : null,
          stageId: input.stageId,
          probability: input.probability,
        },
        include: {
          contact: true,
          pipeline: true,
        },
      });

      await prisma.activity.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          contactId: input.contactId,
          type: "deal_created",
          subject: input.title,
          createdBy: ctx.dbUser.id,
        },
      });

      void fireTrigger(ctx.effectiveTenantId, "deal.created", {
        dealId: deal.id,
        contactId: input.contactId,
        title: input.title,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        value: input.value,
      });

      return deal;
    }),

  update: tenantProcedure
    .input(
      z.object({
        dealId: z.string().uuid(),
        title: z.string().optional(),
        value: z.number().optional(),
        stageId: z.string().optional(),
        probability: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.deal.findFirst({
        where: { id: input.dealId, tenantId: ctx.effectiveTenantId },
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const { dealId, ...updateFields } = input;

      const data: Record<string, unknown> = {};
      if (updateFields.title !== undefined) data.title = updateFields.title;
      if (updateFields.value !== undefined)
        data.value = new Prisma.Decimal(updateFields.value);
      if (updateFields.stageId !== undefined) data.stageId = updateFields.stageId;
      if (updateFields.probability !== undefined)
        data.probability = updateFields.probability;

      const deal = await prisma.deal.update({
        where: { id: dealId },
        data,
        include: {
          contact: true,
          pipeline: true,
        },
      });

      // If stage changed, create an activity and fire trigger
      if (input.stageId && input.stageId !== existing.stageId) {
        await prisma.activity.create({
          data: {
            tenantId: ctx.effectiveTenantId,
            contactId: existing.contactId,
            type: "deal_stage_changed",
            metadata: {
              from: existing.stageId,
              to: input.stageId,
            },
            createdBy: ctx.dbUser.id,
          },
        });

        void fireTrigger(ctx.effectiveTenantId, "deal.stage_changed", {
          dealId: existing.id,
          contactId: existing.contactId,
          fromStage: existing.stageId,
          toStage: input.stageId,
        });
      }

      return deal;
    }),

  close: tenantProcedure
    .input(
      z.object({
        dealId: z.string().uuid(),
        won: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.deal.findFirst({
        where: { id: input.dealId, tenantId: ctx.effectiveTenantId },
        include: { pipeline: true },
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Lookup the won/lost stage from pipeline stages JSON
      const stages = existing.pipeline.stages as Array<{
        id: string;
        name?: string;
      }>;
      const targetStage = stages.find(
        (s) => s.id === (input.won ? "won" : "lost")
      );
      const targetStageId = targetStage?.id ?? (input.won ? "won" : "lost");

      const deal = await prisma.deal.update({
        where: { id: input.dealId },
        data: {
          closedAt: new Date(),
          stageId: targetStageId,
        },
        include: {
          contact: true,
          pipeline: true,
        },
      });

      await prisma.activity.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          contactId: existing.contactId,
          type: input.won ? "deal_won" : "deal_lost",
          subject: existing.title,
          createdBy: ctx.dbUser.id,
        },
      });

      void fireTrigger(
        ctx.effectiveTenantId,
        input.won ? "deal.won" : "deal.lost",
        {
          dealId: existing.id,
          contactId: existing.contactId,
        }
      );

      // Notify on deal won
      if (input.won) {
        const dealValue = existing.value ? Number(existing.value) : null;
        notifyDealWon(ctx.effectiveTenantId, existing.title, dealValue).catch(() => {
          /* fire-and-forget — don't block the mutation */
        });
      }

      return deal;
    }),

  delete: tenantProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deal = await prisma.deal.findFirst({
        where: { id: input.dealId, tenantId: ctx.effectiveTenantId },
      });

      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.deal.delete({ where: { id: input.dealId } });
      return { success: true };
    }),

  exportCSV: tenantProcedure
    .input(
      z
        .object({
          pipelineId: z.string().uuid().optional(),
          stageId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const deals = await prisma.deal.findMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          ...(input?.pipelineId && { pipelineId: input.pipelineId }),
          ...(input?.stageId && { stageId: input.stageId }),
        },
        include: { contact: true },
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "Titulo",
        "Valor",
        "Moneda",
        "Etapa",
        "Probabilidad",
        "Contacto",
        "Email Contacto",
        "Cerrado",
        "Creado",
      ];

      const rows = deals.map((d) => [
        d.title,
        d.value ? String(d.value) : "",
        d.currency,
        d.stageId,
        d.probability != null ? String(d.probability) : "",
        [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" "),
        d.contact.email ?? "",
        d.closedAt ? d.closedAt.toISOString() : "",
        d.createdAt.toISOString(),
      ]);

      return { csv: buildCsvString(headers, rows) };
    }),

  getStats: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.effectiveTenantId;

    // Get all deals for tenant
    const deals = await prisma.deal.findMany({
      where: { tenantId },
    });

    const totalDeals = deals.length;
    const totalValue = deals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0),
      0
    );
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

    // Win rate: won / total closed
    const closedDeals = deals.filter((d) => d.closedAt !== null);
    const wonDeals = closedDeals.filter((d) => d.stageId === "won");
    const winRate =
      closedDeals.length > 0 ? wonDeals.length / closedDeals.length : 0;

    // Get default pipeline for stage names
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const pipelineStages = (defaultPipeline?.stages ?? []) as Array<{
      id: string;
      name: string;
    }>;

    // Aggregate deals by stage
    const stageMap = new Map<
      string,
      { stageId: string; stageName: string; count: number; value: number }
    >();

    for (const stage of pipelineStages) {
      stageMap.set(stage.id, {
        stageId: stage.id,
        stageName: stage.name,
        count: 0,
        value: 0,
      });
    }

    for (const deal of deals) {
      const entry = stageMap.get(deal.stageId);
      if (entry) {
        entry.count += 1;
        entry.value += deal.value ? Number(deal.value) : 0;
      } else {
        stageMap.set(deal.stageId, {
          stageId: deal.stageId,
          stageName: deal.stageId,
          count: 1,
          value: deal.value ? Number(deal.value) : 0,
        });
      }
    }

    const dealsByStage = Array.from(stageMap.values());

    return {
      totalDeals,
      totalValue,
      avgDealSize,
      winRate,
      dealsByStage,
    };
  }),
});
