import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { generateReportPDF } from "@/server/reports/pdf-generator";

export const reportsRouter = router({
  /**
   * Generate a PDF report for the given date range.
   * Returns the PDF as a base64-encoded string.
   */
  generate: tenantProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.effectiveTenantId },
        select: { name: true },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant no encontrado",
        });
      }

      const pdfBuffer = await generateReportPDF({
        tenantId: ctx.effectiveTenantId,
        dateRange: { from: input.from, to: input.to },
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const tenantSlug = tenant.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      return {
        pdf: Buffer.from(pdfBuffer).toString("base64"),
        filename: `reporte-${tenantSlug}-${dateStr}.pdf`,
      };
    }),

  /**
   * Schedule a recurring report to be emailed.
   * Stores the schedule in AiMemory with category="report_schedule".
   */
  scheduleReport: tenantProcedure
    .input(
      z.object({
        frequency: z.enum(["daily", "weekly", "monthly"]),
        recipients: z.array(z.string().email()).min(1),
        reportType: z.string().optional().default("general"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `schedule_${input.frequency}_${Date.now()}`;
      const schedule = await prisma.aiMemory.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          category: "report_schedule",
          key,
          value: JSON.stringify({
            frequency: input.frequency,
            recipients: input.recipients,
            reportType: input.reportType,
          }),
          source: "user",
        },
      });

      return {
        id: schedule.id,
        key: schedule.key,
        frequency: input.frequency,
        recipients: input.recipients,
        reportType: input.reportType,
        createdAt: schedule.createdAt,
      };
    }),

  /**
   * List all report schedules for the tenant.
   */
  listSchedules: tenantProcedure.query(async ({ ctx }) => {
    const schedules = await prisma.aiMemory.findMany({
      where: {
        tenantId: ctx.effectiveTenantId,
        category: "report_schedule",
      },
      orderBy: { createdAt: "desc" },
    });

    return schedules.map((s) => {
      const parsed = JSON.parse(s.value) as {
        frequency: string;
        recipients: string[];
        reportType: string;
      };
      return {
        id: s.id,
        key: s.key,
        frequency: parsed.frequency,
        recipients: parsed.recipients,
        reportType: parsed.reportType,
        createdAt: s.createdAt,
      };
    });
  }),

  /**
   * Delete a report schedule by id.
   */
  deleteSchedule: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const schedule = await prisma.aiMemory.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.effectiveTenantId,
          category: "report_schedule",
        },
      });

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule no encontrado",
        });
      }

      await prisma.aiMemory.delete({ where: { id: input.id } });

      return { deleted: true };
    }),

  /**
   * Get latest pre-computed AI insights from AiMemory.
   */
  getInsights: tenantProcedure.query(async ({ ctx }) => {
    const insights = await prisma.aiMemory.findMany({
      where: {
        tenantId: ctx.effectiveTenantId,
        category: "insight",
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return insights.map((i) => ({
      id: i.id,
      key: i.key,
      value: i.value,
      source: i.source,
      updatedAt: i.updatedAt,
    }));
  }),
});
