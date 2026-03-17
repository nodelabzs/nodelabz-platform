import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

export const campaignsRouter = router({
  listMetrics: tenantProcedure
    .input(
      z.object({
        platform: z.string().optional(),
        from: z.date(),
        to: z.date(),
        groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.CampaignMetricWhereInput = {
        tenantId: ctx.effectiveTenantId,
        date: { gte: input.from, lte: input.to },
        ...(input.platform && { platform: input.platform }),
      };

      const metrics = await prisma.campaignMetric.findMany({
        where,
        orderBy: { date: "asc" },
      });

      // Group by the requested period
      const grouped = new Map<
        string,
        {
          date: string;
          impressions: number;
          clicks: number;
          spend: number;
          conversions: number;
          revenue: number;
        }
      >();

      for (const m of metrics) {
        const d = new Date(m.date);
        let key: string;

        switch (input.groupBy) {
          case "week": {
            // ISO week: start of the week (Monday)
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(d);
            weekStart.setDate(diff);
            key = weekStart.toISOString().split("T")[0]!;
            break;
          }
          case "month":
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
            break;
          default:
            key = d.toISOString().split("T")[0]!;
        }

        const existing = grouped.get(key);
        if (existing) {
          existing.impressions += m.impressions;
          existing.clicks += m.clicks;
          existing.spend += Number(m.spend);
          existing.conversions += m.conversions;
          existing.revenue += Number(m.revenue);
        } else {
          grouped.set(key, {
            date: key,
            impressions: m.impressions,
            clicks: m.clicks,
            spend: Number(m.spend),
            conversions: m.conversions,
            revenue: Number(m.revenue),
          });
        }
      }

      return Array.from(grouped.values()).map((row) => ({
        ...row,
        ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
        cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
        roas: row.spend > 0 ? row.revenue / row.spend : 0,
      }));
    }),

  listCampaigns: tenantProcedure
    .input(
      z
        .object({
          platform: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.CampaignMetricWhereInput = {
        tenantId: ctx.effectiveTenantId,
        ...(input?.platform && { platform: input.platform }),
      };

      const metrics = await prisma.campaignMetric.findMany({ where });

      // Aggregate by campaignId
      const campaignMap = new Map<
        string,
        {
          campaignId: string;
          campaignName: string;
          platform: string;
          totalSpend: number;
          totalConversions: number;
          totalRevenue: number;
        }
      >();

      for (const m of metrics) {
        const existing = campaignMap.get(m.campaignId);
        if (existing) {
          existing.totalSpend += Number(m.spend);
          existing.totalConversions += m.conversions;
          existing.totalRevenue += Number(m.revenue);
        } else {
          campaignMap.set(m.campaignId, {
            campaignId: m.campaignId,
            campaignName: m.campaignName,
            platform: m.platform,
            totalSpend: Number(m.spend),
            totalConversions: m.conversions,
            totalRevenue: Number(m.revenue),
          });
        }
      }

      return Array.from(campaignMap.values()).map((c) => ({
        ...c,
        roas: c.totalSpend > 0 ? c.totalRevenue / c.totalSpend : 0,
      }));
    }),

  getChannelComparison: tenantProcedure.query(async ({ ctx }) => {
    const metrics = await prisma.campaignMetric.findMany({
      where: { tenantId: ctx.effectiveTenantId },
    });

    // Aggregate by platform
    const platformMap = new Map<
      string,
      {
        platform: string;
        totalSpend: number;
        totalRevenue: number;
        totalLeads: number;
      }
    >();

    for (const m of metrics) {
      const existing = platformMap.get(m.platform);
      if (existing) {
        existing.totalSpend += Number(m.spend);
        existing.totalRevenue += Number(m.revenue);
        existing.totalLeads += m.conversions;
      } else {
        platformMap.set(m.platform, {
          platform: m.platform,
          totalSpend: Number(m.spend),
          totalRevenue: Number(m.revenue),
          totalLeads: m.conversions,
        });
      }
    }

    return Array.from(platformMap.values()).map((p) => ({
      ...p,
      roas: p.totalSpend > 0 ? p.totalRevenue / p.totalSpend : 0,
    }));
  }),
});
