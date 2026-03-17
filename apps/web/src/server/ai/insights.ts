import { prisma } from "@nodelabz/db";

/**
 * Compute aggregated marketing insights and store them in AiMemory
 * for fast retrieval by the AI conversation layer.
 */
export async function computeAndStoreInsights(
  tenantId: string
): Promise<void> {
  // Get latest 30 days of campaign metrics
  const metrics = await prisma.campaignMetric.findMany({
    where: {
      tenantId,
      date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  // Aggregate by platform
  const byPlatform: Record<
    string,
    { spend: number; revenue: number; conversions: number }
  > = {};

  for (const m of metrics) {
    const p = m.platform;
    if (!byPlatform[p])
      byPlatform[p] = { spend: 0, revenue: 0, conversions: 0 };
    byPlatform[p].spend += Number(m.spend);
    byPlatform[p].revenue += Number(m.revenue);
    byPlatform[p].conversions += m.conversions;
  }

  // Compute ROAS per channel and sort
  const channels = Object.entries(byPlatform).map(([platform, data]) => ({
    platform,
    ...data,
    roas: data.spend > 0 ? data.revenue / data.spend : 0,
  }));
  channels.sort((a, b) => b.roas - a.roas);

  // CRM counts
  const contactCount = await prisma.contact.count({ where: { tenantId } });
  const dealCount = await prisma.deal.count({ where: { tenantId } });
  const wonDeals = await prisma.deal.count({
    where: { tenantId, stageId: "won" },
  });

  const insights = {
    topChannel: channels[0] || null,
    worstChannel: channels[channels.length - 1] || null,
    totalSpend: channels.reduce((sum, c) => sum + c.spend, 0),
    totalRevenue: channels.reduce((sum, c) => sum + c.revenue, 0),
    contactCount,
    dealCount,
    wonDeals,
    winRate: dealCount > 0 ? wonDeals / dealCount : 0,
    channelBreakdown: channels,
    computedAt: new Date().toISOString(),
  };

  await prisma.aiMemory.upsert({
    where: {
      tenantId_category_key: {
        tenantId,
        category: "insights",
        key: "latest",
      },
    },
    create: {
      tenantId,
      category: "insights",
      key: "latest",
      value: JSON.stringify(insights),
    },
    update: { value: JSON.stringify(insights) },
  });
}

/**
 * Retrieve the latest pre-computed insights for a tenant.
 */
export async function getLatestInsights(
  tenantId: string
): Promise<Record<string, unknown> | null> {
  const record = await prisma.aiMemory.findUnique({
    where: {
      tenantId_category_key: {
        tenantId,
        category: "insights",
        key: "latest",
      },
    },
  });
  return record ? JSON.parse(record.value) : null;
}
