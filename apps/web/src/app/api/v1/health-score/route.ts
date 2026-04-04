import { prisma } from "@nodelabz/db";
import {
  authenticateApiKey,
  requirePermission,
  apiError,
  apiSuccess,
} from "@/server/api/auth";

/**
 * GET /api/v1/health-score — Get the latest health score for the tenant
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "health_score");

    const healthScore = await prisma.healthScore.findFirst({
      where: { tenantId: auth.tenantId },
      orderBy: { calculatedAt: "desc" },
    });

    if (!healthScore) {
      return apiSuccess({
        data: null,
        message: "No health score calculated yet. Use POST to calculate.",
      });
    }

    return apiSuccess({ data: healthScore });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] GET /health-score error:", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/v1/health-score — Trigger a health score recalculation
 *
 * This is a simplified recalculation that reuses the score dimensions
 * already stored. For the full AI-powered recalculation, use the dashboard.
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "health_score");

    const tenantId = auth.tenantId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ---- Ad Performance (25%) ----
    const adPlatforms = ["meta_ads", "google_ads", "tiktok"];
    const activeAdIntegrations = await prisma.integration.count({
      where: { tenantId, platform: { in: adPlatforms }, status: "active" },
    });

    let adPerformance = 0;
    if (activeAdIntegrations === 1) adPerformance += 20;
    else if (activeAdIntegrations === 2) adPerformance += 30;
    else if (activeAdIntegrations > 2) adPerformance += 40;

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

      const hoursSince =
        (now.getTime() - campaignMetrics[0]!.date.getTime()) / (1000 * 60 * 60);
      if (hoursSince <= 24) adPerformance += 25;
      else if (hoursSince <= 48) adPerformance += 15;
      else if (hoursSince <= 168) adPerformance += 5;
    }
    adPerformance = Math.min(adPerformance, 100);

    // ---- Content Engagement (20%) ----
    let contentEngagement = 25; // base
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
    contentEngagement = Math.min(contentEngagement, 100);

    // ---- Email Effectiveness (20%) ----
    let emailEffectiveness = 0;
    const templateCount = await prisma.emailTemplate.count({ where: { tenantId } });
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

    // ---- Lead Conversion (20%) ----
    let leadConversion = 0;
    const contactCount = await prisma.contact.count({ where: { tenantId } });
    if (contactCount > 200) leadConversion += 35;
    else if (contactCount > 50) leadConversion += 25;
    else if (contactCount > 0) leadConversion += 15;
    const dealCount = await prisma.deal.count({ where: { tenantId } });
    if (dealCount > 10) leadConversion += 25;
    else if (dealCount > 0) leadConversion += 15;
    const wonDeals = await prisma.deal.count({ where: { tenantId, stageId: "won" } });
    if (wonDeals > 0) leadConversion += 20;
    if (contactCount > 0) {
      const completeContacts = await prisma.contact.count({
        where: { tenantId, email: { not: null }, phone: { not: null } },
      });
      leadConversion += Math.round(20 * (completeContacts / contactCount));
    }
    leadConversion = Math.min(leadConversion, 100);

    // ---- Revenue Attribution (15%) ----
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
      if (revenueMetrics.some((m) => Number(m.spend) > 0 && Number(m.revenue) > 0))
        revenueAttribution += 20;
      const totalRevenue = revenueMetrics.reduce((s, m) => s + Number(m.revenue), 0);
      if (totalRevenue > 1000) revenueAttribution += 20;
    }
    revenueAttribution = Math.min(revenueAttribution, 100);

    // ---- Overall ----
    const overallScore = Math.round(
      adPerformance * 0.25 +
        contentEngagement * 0.2 +
        emailEffectiveness * 0.2 +
        leadConversion * 0.2 +
        revenueAttribution * 0.15,
    );

    // Store
    const healthScore = await prisma.healthScore.create({
      data: {
        tenantId,
        overallScore,
        adPerformance,
        contentEngagement,
        emailEffectiveness,
        leadConversion,
        revenueAttribution,
        insights: [
          adPerformance < 30 ? "Conecta plataformas de ads para mejorar visibilidad" : null,
          contentEngagement < 30 ? "Activa email marketing y WhatsApp para engagement" : null,
          leadConversion < 30 ? "Importa contactos y configura tu pipeline" : null,
        ].filter(Boolean),
        recommendations: [],
      },
    });

    return apiSuccess({ data: healthScore }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] POST /health-score error:", error);
    return apiError("Internal server error", 500);
  }
}
