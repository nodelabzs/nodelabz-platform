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
