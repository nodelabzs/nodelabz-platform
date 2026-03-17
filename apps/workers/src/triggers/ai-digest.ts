import { task } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";

/**
 * Compute insights and generate a daily AI digest notification.
 * Normally scheduled daily via cron, but can be triggered on-demand.
 */
export const aiDigest = task({
  id: "ai-digest",
  run: async (payload: { tenantId: string }) => {
    const { tenantId } = payload;

    console.log(`Generating AI digest for tenant ${tenantId}`);

    // ── Step 1: Compute insights ────────────────────────────────────────
    const metrics = await prisma.campaignMetric.findMany({
      where: {
        tenantId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

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

    const channels = Object.entries(byPlatform).map(([platform, data]) => ({
      platform,
      ...data,
      roas: data.spend > 0 ? data.revenue / data.spend : 0,
    }));
    channels.sort((a, b) => b.roas - a.roas);

    const contactCount = await prisma.contact.count({ where: { tenantId } });
    const dealCount = await prisma.deal.count({ where: { tenantId } });
    const wonDeals = await prisma.deal.count({
      where: { tenantId, stageId: "won" },
    });

    const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
    const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
    const winRate = dealCount > 0 ? wonDeals / dealCount : 0;

    // Store insights in AiMemory
    const insights = {
      topChannel: channels[0] || null,
      worstChannel: channels[channels.length - 1] || null,
      totalSpend,
      totalRevenue,
      contactCount,
      dealCount,
      wonDeals,
      winRate,
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

    // ── Step 2: Generate digest summary ─────────────────────────────────
    const parts: string[] = [];

    if (channels.length > 0) {
      const top = channels[0];
      parts.push(
        `Tu mejor canal es ${top.platform} con ROAS ${top.roas.toFixed(1)}x.`
      );
    }

    if (totalSpend > 0) {
      const overallRoas = totalRevenue / totalSpend;
      parts.push(
        `Gasto total: $${totalSpend.toFixed(0)} | Revenue: $${totalRevenue.toFixed(0)} | ROAS: ${overallRoas.toFixed(1)}x.`
      );
    }

    parts.push(`Contactos: ${contactCount} | Deals: ${dealCount} | Win rate: ${(winRate * 100).toFixed(0)}%.`);

    if (channels.length > 1) {
      const worst = channels[channels.length - 1];
      if (worst.roas < 1 && worst.spend > 0) {
        parts.push(
          `Atencion: ${worst.platform} tiene ROAS bajo (${worst.roas.toFixed(1)}x). Considera reasignar presupuesto.`
        );
      }
    }

    const summary = parts.join(" ");

    // ── Step 3: Create notification ─────────────────────────────────────
    await prisma.notification.create({
      data: {
        tenantId,
        type: "ai_digest",
        title: "Resumen diario",
        body: summary,
        metadata: { channelCount: channels.length, totalSpend, totalRevenue },
      },
    });

    console.log(`AI digest created for tenant ${tenantId}`);

    return { success: true, summary };
  },
});
