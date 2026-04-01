import { prisma, Prisma } from "@nodelabz/db";
import { refreshGoogleToken } from "./google/auth";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  synced?: number;
  error?: string;
}

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  impressions: string;
  clicks: string;
  spend: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function ensureGoogleToken(integration: {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<string> {
  if (integration.expiresAt && integration.expiresAt > new Date()) {
    return integration.accessToken;
  }
  if (!integration.refreshToken) {
    throw new Error("Token expired and no refresh token available");
  }
  const { accessToken, expiresIn } = await refreshGoogleToken(integration.refreshToken);
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
  return accessToken;
}

// ── Meta Ads Sync ─────────────────────────────────────────────────────────

export async function syncMetaAds(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  if (integration.expiresAt && integration.expiresAt < new Date()) {
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "expired" } });
    return { success: false, error: "Token expired" };
  }

  const accountId = integration.accountId;
  if (!accountId) return { success: false, error: "Missing accountId" };

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeRange = JSON.stringify({
      since: thirtyDaysAgo.toISOString().split("T")[0],
      until: now.toISOString().split("T")[0],
    });

    const params = new URLSearchParams({
      fields: "impressions,clicks,spend,actions,action_values,campaign_id,campaign_name",
      time_range: timeRange,
      time_increment: "1",
      level: "campaign",
      access_token: integration.accessToken,
      limit: "500",
    });

    const allRows: MetaInsightRow[] = [];
    let url: string | null = `https://graph.facebook.com/v21.0/act_${accountId}/insights?${params.toString()}`;

    while (url) {
      const response: Response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Meta API error ${response.status}: ${errorText}`);
      }
      const json: { data?: MetaInsightRow[]; paging?: { next?: string } } = await response.json();
      allRows.push(...(json.data ?? []));
      url = json.paging?.next ?? null;
    }

    let syncedCount = 0;
    for (const row of allRows) {
      const impressions = parseInt(row.impressions, 10) || 0;
      const clicks = parseInt(row.clicks, 10) || 0;
      const spend = parseFloat(row.spend) || 0;
      const conversions = (row.actions ?? [])
        .filter((a) => a.action_type.includes("lead") || a.action_type.includes("offsite_conversion"))
        .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0);
      const revenue = (row.action_values ?? [])
        .filter((a) => a.action_type.includes("purchase"))
        .reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);

      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const date = new Date(row.date_start);

      await prisma.campaignMetric.upsert({
        where: {
          tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId: row.campaign_id, date },
        },
        update: {
          campaignName: row.campaign_name, impressions, clicks,
          spend: new Prisma.Decimal(spend), conversions, revenue: new Prisma.Decimal(revenue),
          ctr: new Prisma.Decimal(ctr), cpc: new Prisma.Decimal(cpc), roas: new Prisma.Decimal(roas),
        },
        create: {
          tenantId, integrationId, platform: "meta_ads",
          campaignId: row.campaign_id, campaignName: row.campaign_name, date,
          impressions, clicks, spend: new Prisma.Decimal(spend), conversions,
          revenue: new Prisma.Decimal(revenue), ctr: new Prisma.Decimal(ctr),
          cpc: new Prisma.Decimal(cpc), roas: new Prisma.Decimal(roas),
        },
      });
      syncedCount++;
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), status: "active" },
    });

    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Meta Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    return { success: false, error: message };
  }
}

// ── Google Ads Sync ───────────────────────────────────────────────────────

export async function syncGoogleAds(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  const customerId = integration.accountId;
  if (!customerId || customerId === "pending") {
    return { success: false, error: "Google Ads requiere un developer token — configura GOOGLE_ADS_DEVELOPER_TOKEN en .env" };
  }

  try {
    const accessToken = await ensureGoogleToken(integration);

    const query = `
      SELECT campaign.id, campaign.name, segments.date,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value
      FROM campaign WHERE segments.date DURING LAST_30_DAYS
    `.trim();

    const response = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Ads API error ${response.status}: ${errorText}`);
    }

    const results = await response.json();
    const allRows: Array<{
      campaign: { id: string; name: string };
      segments: { date: string };
      metrics: { impressions: string; clicks: string; costMicros: string; conversions: number; conversionsValue: number };
    }> = [];

    for (const batch of results) {
      if (batch.results) allRows.push(...batch.results);
    }

    let syncedCount = 0;
    for (const row of allRows) {
      const impressions = parseInt(row.metrics.impressions, 10) || 0;
      const clicks = parseInt(row.metrics.clicks, 10) || 0;
      const spend = (parseInt(row.metrics.costMicros, 10) || 0) / 1_000_000;
      const conversions = row.metrics.conversions || 0;
      const revenue = row.metrics.conversionsValue || 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const date = new Date(row.segments.date);

      await prisma.campaignMetric.upsert({
        where: {
          tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId: row.campaign.id, date },
        },
        update: {
          campaignName: row.campaign.name, impressions, clicks,
          spend: new Prisma.Decimal(spend), conversions, revenue: new Prisma.Decimal(revenue),
          ctr: new Prisma.Decimal(ctr), cpc: new Prisma.Decimal(cpc), roas: new Prisma.Decimal(roas),
        },
        create: {
          tenantId, integrationId, platform: "google_ads",
          campaignId: row.campaign.id, campaignName: row.campaign.name, date,
          impressions, clicks, spend: new Prisma.Decimal(spend), conversions,
          revenue: new Prisma.Decimal(revenue), ctr: new Prisma.Decimal(ctr),
          cpc: new Prisma.Decimal(cpc), roas: new Prisma.Decimal(roas),
        },
      });
      syncedCount++;
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), status: "active" },
    });

    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Google Ads Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    return { success: false, error: message };
  }
}

// ── GA4 Sync ──────────────────────────────────────────────────────────────

export async function syncGA4(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  const propertyId = integration.accountId;
  if (!propertyId) return { success: false, error: "Sin propiedad GA4 vinculada — verifica que tu cuenta de Google tenga una propiedad GA4 activa" };

  try {
    const accessToken = await ensureGoogleToken(integration);

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [
            { name: "date" },
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "conversions" },
            { name: "engagementRate" },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GA4 API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rows: Array<{
      dimensionValues: Array<{ value: string }>;
      metricValues: Array<{ value: string }>;
    }> = data.rows || [];

    let syncedCount = 0;
    for (const row of rows) {
      const dateStr = row.dimensionValues[0]?.value || "";
      const source = row.dimensionValues[1]?.value || "(direct)";
      const medium = row.dimensionValues[2]?.value || "(none)";
      const sessions = parseInt(row.metricValues[0]?.value || "0", 10);
      const totalUsers = parseInt(row.metricValues[1]?.value || "0", 10);
      const conversions = parseInt(row.metricValues[2]?.value || "0", 10);
      const engagementRate = parseFloat(row.metricValues[3]?.value || "0");

      const campaignId = `${source} / ${medium}`;
      const date = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);

      await prisma.campaignMetric.upsert({
        where: {
          tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId, date },
        },
        update: {
          campaignName: campaignId, impressions: sessions, clicks: totalUsers,
          spend: new Prisma.Decimal(0), conversions, revenue: new Prisma.Decimal(0),
          ctr: new Prisma.Decimal(engagementRate), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0),
        },
        create: {
          tenantId, integrationId, platform: "ga4",
          campaignId, campaignName: campaignId, date,
          impressions: sessions, clicks: totalUsers,
          spend: new Prisma.Decimal(0), conversions, revenue: new Prisma.Decimal(0),
          ctr: new Prisma.Decimal(engagementRate), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0),
        },
      });
      syncedCount++;
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), status: "active" },
    });

    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GA4 Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    return { success: false, error: message };
  }
}

// ── Dispatch: sync a single integration ───────────────────────────────────

export async function syncIntegration(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
    select: { platform: true },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  switch (integration.platform) {
    case "meta_ads":
      return syncMetaAds(tenantId, integrationId);
    case "google_ads":
      return syncGoogleAds(tenantId, integrationId);
    case "ga4":
      return syncGA4(tenantId, integrationId);
    default:
      return { success: false, error: `Sync not supported for ${integration.platform}` };
  }
}

// ── Sync ALL active integrations for a tenant ─────────────────────────────

export async function syncAllIntegrations(tenantId: string): Promise<{ results: Array<{ platform: string; integrationId: string } & SyncResult> }> {
  const integrations = await prisma.integration.findMany({
    where: { tenantId, status: { in: ["active", "expired"] } },
    select: { id: true, platform: true },
  });

  const results: Array<{ platform: string; integrationId: string } & SyncResult> = [];

  for (const integration of integrations) {
    const result = await syncIntegration(tenantId, integration.id);
    results.push({ platform: integration.platform, integrationId: integration.id, ...result });
  }

  return { results };
}
