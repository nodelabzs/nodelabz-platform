import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";

export const dashboardRouter = router({
  getSummary: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.effectiveTenantId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Parallel queries ────────────────────────────────────────────────
    const [
      // Contacts
      totalContacts,
      leadsToday,
      hotLeadsCount,
      // Deals
      totalDeals,
      dealValueAgg,
      deals,
      defaultPipeline,
      recentDealsRaw,
      // Campaigns (last 30 days)
      campaignMetrics,
      // Email
      emailCampaignsSent,
      sentEmailCampaigns,
      // WhatsApp - distinct contacts with unread inbound messages
      unreadConversations,
      // Integrations
      connectedPlatforms,
      totalPlatforms,
    ] = await Promise.all([
      // ── Contacts ──────────────────────────────────────────────────────
      prisma.contact.count({ where: { tenantId } }),

      prisma.contact.count({
        where: { tenantId, createdAt: { gte: startOfToday } },
      }),

      prisma.contact.count({
        where: { tenantId, scoreLabel: "HOT" },
      }),

      // ── Deals ─────────────────────────────────────────────────────────
      prisma.deal.count({ where: { tenantId } }),

      prisma.deal.aggregate({
        where: { tenantId },
        _sum: { value: true },
      }),

      prisma.deal.findMany({
        where: { tenantId },
        select: { stageId: true, value: true, closedAt: true },
      }),

      prisma.pipeline.findFirst({
        where: { tenantId },
        orderBy: { isDefault: "desc" },
      }),

      prisma.deal.findMany({
        where: { tenantId },
        select: {
          id: true,
          title: true,
          value: true,
          createdAt: true,
          contact: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // ── Campaigns (last 30 days) ──────────────────────────────────────
      prisma.campaignMetric.findMany({
        where: { tenantId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
      }),

      // ── Email ─────────────────────────────────────────────────────────
      prisma.emailCampaign.count({
        where: { tenantId, status: "sent" },
      }),

      prisma.emailCampaign.findMany({
        where: { tenantId, status: "sent" },
        select: { stats: true },
      }),

      // ── WhatsApp ──────────────────────────────────────────────────────
      prisma.message.groupBy({
        by: ["contactId"],
        where: {
          tenantId,
          channel: "WHATSAPP",
          direction: "INBOUND",
          status: "received",
        },
        _count: { id: true },
      }),

      // ── Integrations ──────────────────────────────────────────────────
      prisma.integration.count({
        where: { tenantId, status: "active" },
      }),

      prisma.integration.count({
        where: { tenantId },
      }),
    ]);

    // ── Deals: compute aggregated metrics ───────────────────────────────
    const totalDealValue = dealValueAgg._sum.value
      ? Number(dealValueAgg._sum.value)
      : 0;
    const avgDealSize = totalDeals > 0 ? totalDealValue / totalDeals : 0;

    // Win rate: stages containing "Ganado"/"Won" as won, "Perdido"/"Lost" as lost
    const pipelineStages = (defaultPipeline?.stages ?? []) as Array<{
      id: string;
      name: string;
    }>;
    const stageNameMap = new Map(pipelineStages.map((s) => [s.id, s.name]));

    const wonStageIds = new Set(
      pipelineStages
        .filter((s) => /ganado|won/i.test(s.name))
        .map((s) => s.id)
    );
    const lostStageIds = new Set(
      pipelineStages
        .filter((s) => /perdido|lost/i.test(s.name))
        .map((s) => s.id)
    );

    const wonCount = deals.filter((d) => wonStageIds.has(d.stageId)).length;
    const lostCount = deals.filter((d) => lostStageIds.has(d.stageId)).length;
    const winRate = wonCount + lostCount > 0 ? wonCount / (wonCount + lostCount) : 0;

    // Deals by stage (same pattern as deals.getStats)
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
          stageName: stageNameMap.get(deal.stageId) ?? deal.stageId,
          count: 1,
          value: deal.value ? Number(deal.value) : 0,
        });
      }
    }

    const dealsByStage = Array.from(stageMap.values());

    // Recent deals
    const recentDeals = recentDealsRaw.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value ? Number(d.value) : null,
      contactName: [d.contact.firstName, d.contact.lastName]
        .filter(Boolean)
        .join(" "),
      createdAt: d.createdAt,
    }));

    // ── Campaigns: aggregate last 30 days ───────────────────────────────
    let totalSpend = 0;
    let totalRevenue = 0;
    let totalConversions = 0;

    const platformAgg = new Map<
      string,
      { platform: string; spend: number; revenue: number; leads: number }
    >();

    const dailyAgg = new Map<
      string,
      {
        date: string;
        spend: number;
        revenue: number;
        conversions: number;
        clicks: number;
        impressions: number;
      }
    >();

    for (const m of campaignMetrics) {
      const spend = Number(m.spend);
      const revenue = Number(m.revenue);

      totalSpend += spend;
      totalRevenue += revenue;
      totalConversions += m.conversions;

      // Channel breakdown
      const existing = platformAgg.get(m.platform);
      if (existing) {
        existing.spend += spend;
        existing.revenue += revenue;
        existing.leads += m.conversions;
      } else {
        platformAgg.set(m.platform, {
          platform: m.platform,
          spend,
          revenue,
          leads: m.conversions,
        });
      }

      // Daily metrics
      const dateKey = new Date(m.date).toISOString().split("T")[0]!;
      const day = dailyAgg.get(dateKey);
      if (day) {
        day.spend += spend;
        day.revenue += revenue;
        day.conversions += m.conversions;
        day.clicks += m.clicks;
        day.impressions += m.impressions;
      } else {
        dailyAgg.set(dateKey, {
          date: dateKey,
          spend,
          revenue,
          conversions: m.conversions,
          clicks: m.clicks,
          impressions: m.impressions,
        });
      }
    }

    const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const channelBreakdown = Array.from(platformAgg.values()).map((p) => ({
      ...p,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
    }));

    const dailyMetrics = Array.from(dailyAgg.values());

    // ── Email: avg open / click rates from sent campaigns stats ─────────
    let avgOpenRate = 0;
    let avgClickRate = 0;

    if (sentEmailCampaigns.length > 0) {
      let totalOpen = 0;
      let totalClick = 0;
      let counted = 0;

      for (const ec of sentEmailCampaigns) {
        const stats = ec.stats as {
          openRate?: number;
          clickRate?: number;
        } | null;
        if (stats) {
          totalOpen += stats.openRate ?? 0;
          totalClick += stats.clickRate ?? 0;
          counted++;
        }
      }

      if (counted > 0) {
        avgOpenRate = totalOpen / counted;
        avgClickRate = totalClick / counted;
      }
    }

    // ── Return ──────────────────────────────────────────────────────────
    return {
      // Contacts
      totalContacts,
      leadsToday,
      hotLeadsCount,

      // Deals
      totalDeals,
      totalDealValue,
      avgDealSize,
      winRate,
      dealsByStage,
      recentDeals,

      // Campaigns (last 30 days)
      totalSpend,
      totalRevenue,
      totalConversions,
      overallRoas,
      channelBreakdown,
      dailyMetrics,

      // Email
      emailCampaignsSent,
      avgOpenRate,
      avgClickRate,

      // WhatsApp
      unreadConversations: unreadConversations.length,

      // Integrations
      connectedPlatforms,
      totalPlatforms,
    };
  }),
});
