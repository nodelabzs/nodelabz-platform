import { z } from "zod";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { invokeModel } from "@/server/ai/router";

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

  // ── AI-Powered Insights & Recommendations ────────────────────────────
  // Gather campaign data summary for AI context
  const totalSpend = campaignMetrics.reduce((s, m) => s + Number(m.spend), 0);
  const totalRevenue = campaignMetrics.reduce((s, m) => s + Number(m.revenue), 0);
  const totalConversions = campaignMetrics.reduce((s, m) => s + m.conversions, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const platformBreakdown: Record<string, { spend: number; revenue: number; conversions: number }> = {};
  for (const m of campaignMetrics) {
    const p = platformBreakdown[m.platform] ?? { spend: 0, revenue: 0, conversions: 0 };
    p.spend += Number(m.spend);
    p.revenue += Number(m.revenue);
    p.conversions += m.conversions;
    platformBreakdown[m.platform] = p;
  }

  const aiPrompt = `Eres un consultor experto en marketing digital para agencias en Latinoamerica.
Analiza estos datos de la empresa y genera recomendaciones accionables.

HEALTH SCORE: ${overallScore}/100
- Rendimiento de Ads: ${adPerformance}/100
- Engagement de Contenido: ${contentEngagement}/100
- Efectividad de Email: ${emailEffectiveness}/100
- Conversion de Leads: ${leadConversion}/100
- Atribucion de Revenue: ${revenueAttribution}/100

DATOS REALES (ultimos 30 dias):
- Contactos totales: ${contactCount}
- Deals: ${dealCount} (ganados: ${wonDeals})
- Gasto total en ads: $${totalSpend.toFixed(2)}
- Revenue total: $${totalRevenue.toFixed(2)}
- Conversiones: ${totalConversions}
- ROAS promedio: ${avgRoas.toFixed(2)}x
- Campanas de email enviadas: ${sentCampaigns}
- Plantillas de email: ${templateCount}
- Workflows activos: ${activeWorkflows}
- Integraciones de ads activas: ${activeAdIntegrations}
- Mensajes WhatsApp: ${whatsappMessages}
${Object.keys(platformBreakdown).length > 0 ? "\nPOR PLATAFORMA:\n" + Object.entries(platformBreakdown).map(([p, d]) => `- ${p}: gasto=$${d.spend.toFixed(2)}, revenue=$${d.revenue.toFixed(2)}, conversiones=${d.conversions}`).join("\n") : ""}

Responde UNICAMENTE con JSON valido, sin markdown ni texto adicional:
{
  "insights": ["string", "string", "string"],
  "recommendations": [
    { "title": "string", "description": "string", "priority": "high|medium|low" },
    { "title": "string", "description": "string", "priority": "high|medium|low" },
    { "title": "string", "description": "string", "priority": "high|medium|low" }
  ]
}

Reglas:
- 3 insights cortos (1 frase cada uno) describiendo el estado actual
- 3 recomendaciones especificas y accionables para esta empresa
- Prioridad basada en impacto potencial
- Todo en español
- Si no hay datos de campanas, recomienda conectar plataformas y lanzar campanas`;

  let insights: string[] = [];
  let recommendations: Array<{ title: string; description: string; priority: string }> = [];

  try {
    const aiResponse = await invokeModel({
      message: aiPrompt,
      tier: "sonnet",
      maxTokens: 1024,
      systemPrompt: "Eres un experto en marketing digital. Responde SOLO con JSON valido.",
    });

    // Parse AI response — handle potential markdown wrapping
    const jsonStr = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    insights = parsed.insights ?? [];
    recommendations = parsed.recommendations ?? [];
  } catch (error) {
    console.error("[Health Score] AI recommendation generation failed:", error);
    // Fallback to rule-based if AI fails
    if (adPerformance < 30) insights.push("Conecta plataformas de ads para mejorar tu visibilidad");
    if (contentEngagement < 30) insights.push("Activa email marketing y WhatsApp para engagement");
    if (leadConversion < 30) insights.push("Importa contactos y configura tu pipeline");
    if (insights.length === 0) insights.push("Recalcula regularmente para monitorear tu progreso");

    const fallbackPillars = [
      { score: adPerformance, title: "Mejorar rendimiento de ads", description: "Conecta y optimiza tus plataformas de publicidad.", priority: "high" },
      { score: contentEngagement, title: "Aumentar engagement", description: "Activa email y WhatsApp para comunicarte con leads.", priority: "medium" },
      { score: emailEffectiveness, title: "Lanzar campanas de email", description: "Crea plantillas y automatizaciones de email.", priority: "medium" },
      { score: leadConversion, title: "Optimizar conversion", description: "Configura tu pipeline y registra deals.", priority: "high" },
      { score: revenueAttribution, title: "Atribuir revenue", description: "Conecta Stripe para medir ROI por canal.", priority: "low" },
    ];
    recommendations = fallbackPillars
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(({ title, description, priority }) => ({ title, description, priority }));
  }

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
