import { z } from "zod";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";

// ── Inline health score calculation (mirrors worker logic) ─────────────

async function calculateHealthScore(tenantId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Ad Performance (weight 25%) ──────────────────────────────────────
  const adPlatforms = ["meta_ads", "google_ads", "tiktok"];
  const activeAdIntegrations = await prisma.integration.count({
    where: {
      tenantId,
      platform: { in: adPlatforms },
      status: "active",
    },
  });

  let adPerformance = 0;
  if (activeAdIntegrations === 0) adPerformance += 0;
  else if (activeAdIntegrations === 1) adPerformance += 20;
  else if (activeAdIntegrations === 2) adPerformance += 30;
  else adPerformance += 40;

  const campaignMetrics = await prisma.campaignMetric.findMany({
    where: { tenantId, date: { gte: thirtyDaysAgo } },
    orderBy: { date: "desc" },
  });

  if (campaignMetrics.length > 0) {
    const roasValues = campaignMetrics
      .filter((m) => m.roas !== null)
      .map((m) => Number(m.roas));
    const avgRoas =
      roasValues.length > 0
        ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length
        : 0;

    if (avgRoas >= 4) adPerformance += 35;
    else if (avgRoas >= 3) adPerformance += 25;
    else if (avgRoas >= 2) adPerformance += 15;
    else if (avgRoas >= 1) adPerformance += 5;

    const latestMetricDate = campaignMetrics[0]!.date;
    const hoursSinceLastMetric =
      (now.getTime() - latestMetricDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastMetric <= 24) adPerformance += 25;
    else if (hoursSinceLastMetric <= 48) adPerformance += 15;
    else if (hoursSinceLastMetric <= 168) adPerformance += 5;
  }

  adPerformance = Math.min(adPerformance, 100);

  // ── Content Engagement (weight 20%) ──────────────────────────────────
  let contentEngagement = 0;

  const emailMetrics = await prisma.campaignMetric.count({
    where: { tenantId, platform: "email" },
  });
  if (emailMetrics > 0) contentEngagement += 25;

  const whatsappMessages = await prisma.message.count({
    where: { tenantId, channel: "WHATSAPP" },
  });
  if (whatsappMessages > 0) contentEngagement += 25;

  const socialIntegrations = await prisma.integration.count({
    where: {
      tenantId,
      platform: { notIn: [...adPlatforms, "stripe", "email"] },
      status: "active",
    },
  });
  if (socialIntegrations > 0) contentEngagement += 25;

  contentEngagement += 25; // base score
  contentEngagement = Math.min(contentEngagement, 100);

  // ── Email Effectiveness (weight 20%) ─────────────────────────────────
  let emailEffectiveness = 0;

  const templateCount = await prisma.emailTemplate.count({
    where: { tenantId },
  });
  if (templateCount > 0) emailEffectiveness += 20;
  if (templateCount > 5) emailEffectiveness += 25;

  const sentCampaigns = await prisma.emailCampaign.count({
    where: { tenantId, status: "sent" },
  });
  if (sentCampaigns > 0) emailEffectiveness += 30;

  const activeWorkflows = await prisma.workflow.count({
    where: { tenantId, isActive: true },
  });
  if (activeWorkflows > 0) emailEffectiveness += 25;

  emailEffectiveness = Math.min(emailEffectiveness, 100);

  // ── Lead Conversion (weight 20%) ─────────────────────────────────────
  let leadConversion = 0;

  const contactCount = await prisma.contact.count({
    where: { tenantId },
  });
  if (contactCount > 200) leadConversion += 35;
  else if (contactCount > 50) leadConversion += 25;
  else if (contactCount > 0) leadConversion += 15;

  const dealCount = await prisma.deal.count({
    where: { tenantId },
  });
  if (dealCount > 10) leadConversion += 25;
  else if (dealCount > 0) leadConversion += 15;

  const wonDeals = await prisma.deal.count({
    where: { tenantId, stageId: "won" },
  });
  if (wonDeals > 0) leadConversion += 20;

  if (contactCount > 0) {
    const completeContacts = await prisma.contact.count({
      where: {
        tenantId,
        email: { not: null },
        phone: { not: null },
      },
    });
    const completenessRatio = completeContacts / contactCount;
    leadConversion += Math.round(20 * completenessRatio);
  }

  leadConversion = Math.min(leadConversion, 100);

  // ── Revenue Attribution (weight 15%) ─────────────────────────────────
  let revenueAttribution = 0;

  const stripeIntegration = await prisma.integration.count({
    where: { tenantId, platform: "stripe", status: "active" },
  });
  if (stripeIntegration > 0) revenueAttribution += 30;

  const revenueMetrics = await prisma.campaignMetric.findMany({
    where: { tenantId, revenue: { gt: 0 } },
    select: { revenue: true, spend: true },
  });

  if (revenueMetrics.length > 0) {
    revenueAttribution += 30;

    const hasSpendAndRevenue = revenueMetrics.some(
      (m) => Number(m.spend) > 0 && Number(m.revenue) > 0
    );
    if (hasSpendAndRevenue) revenueAttribution += 20;

    const totalRevenue = revenueMetrics.reduce(
      (sum, m) => sum + Number(m.revenue),
      0
    );
    if (totalRevenue > 1000) revenueAttribution += 20;
  }

  revenueAttribution = Math.min(revenueAttribution, 100);

  // ── Overall Score ────────────────────────────────────────────────────
  const overallScore = Math.round(
    adPerformance * 0.25 +
      contentEngagement * 0.2 +
      emailEffectiveness * 0.2 +
      leadConversion * 0.2 +
      revenueAttribution * 0.15
  );

  // ── Insights ─────────────────────────────────────────────────────────
  const insights: string[] = [];
  if (adPerformance < 30)
    insights.push("Conecta plataformas de ads para mejorar tu visibilidad");
  if (contentEngagement < 30)
    insights.push("Activa email marketing y WhatsApp para engagement");
  if (emailEffectiveness < 30)
    insights.push("Crea plantillas de email y automatizaciones");
  if (leadConversion < 30)
    insights.push("Importa contactos y configura tu pipeline");
  if (revenueAttribution < 30)
    insights.push("Conecta Stripe para atribuir revenue a canales");

  // ── Recommendations ──────────────────────────────────────────────────
  const pillarScores = [
    {
      score: adPerformance,
      rec: {
        title: "Conectar plataformas de publicidad",
        description:
          "Integra Meta Ads, Google Ads o TikTok para trackear el rendimiento de tus campanas en tiempo real.",
        impact: "high" as const,
      },
    },
    {
      score: contentEngagement,
      rec: {
        title: "Activar canales de engagement",
        description:
          "Configura email marketing y WhatsApp Business para comunicarte con tus leads de forma automatizada.",
        impact: "high" as const,
      },
    },
    {
      score: emailEffectiveness,
      rec: {
        title: "Crear campanas de email",
        description:
          "Disena plantillas de email, crea automatizaciones y lanza campanas para nutrir tus leads.",
        impact: "medium" as const,
      },
    },
    {
      score: leadConversion,
      rec: {
        title: "Optimizar pipeline de ventas",
        description:
          "Importa contactos, configura tu pipeline y registra deals para mejorar la conversion.",
        impact: "high" as const,
      },
    },
    {
      score: revenueAttribution,
      rec: {
        title: "Atribuir revenue a canales",
        description:
          "Conecta Stripe y vincula revenue a campanas para entender que canal genera mas ROI.",
        impact: "medium" as const,
      },
    },
  ];

  const recommendations = pillarScores
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((p) => p.rec);

  // ── Store ────────────────────────────────────────────────────────────
  const healthScore = await prisma.healthScore.create({
    data: {
      tenantId,
      overallScore,
      adPerformance,
      contentEngagement,
      emailEffectiveness,
      leadConversion,
      revenueAttribution,
      insights,
      recommendations,
    },
  });

  return { success: true, overallScore, healthScore };
}

// ── tRPC Router ────────────────────────────────────────────────────────

export const healthScoreRouter = router({
  /**
   * Get the latest health score for the current tenant.
   */
  getCurrent: tenantProcedure.query(async ({ ctx }) => {
    const healthScore = await prisma.healthScore.findFirst({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { calculatedAt: "desc" },
    });

    return healthScore ?? null;
  }),

  /**
   * Get health score history for trend sparklines.
   */
  getHistory: tenantProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(365).default(30),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const scores = await prisma.healthScore.findMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          calculatedAt: { gte: since },
        },
        orderBy: { calculatedAt: "asc" },
      });

      return scores;
    }),

  /**
   * Recalculate health score inline (same algorithm as the worker).
   */
  recalculate: tenantProcedure.mutation(async ({ ctx }) => {
    const result = await calculateHealthScore(ctx.effectiveTenantId);
    return result.healthScore;
  }),
});
