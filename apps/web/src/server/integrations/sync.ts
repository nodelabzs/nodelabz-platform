import { prisma, Prisma } from "@nodelabz/db";
import { refreshGoogleToken } from "./google/auth";
import { notifyIntegrationSync } from "../notifications/notify";
import { decrypt } from "../encryption";

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
    return decrypt(integration.accessToken);
  }
  if (!integration.refreshToken) {
    throw new Error("Token expired and no refresh token available");
  }
  const { accessToken, expiresIn } = await refreshGoogleToken(decrypt(integration.refreshToken));
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
      access_token: decrypt(integration.accessToken),
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

    await notifyIntegrationSync(tenantId, "meta_ads", true, `${syncedCount} registros sincronizados.`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Meta Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    await notifyIntegrationSync(tenantId, "meta_ads", false, message);
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

    await notifyIntegrationSync(tenantId, "google_ads", true, `${syncedCount} registros sincronizados.`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Google Ads Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    await notifyIntegrationSync(tenantId, "google_ads", false, message);
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

      const ga4Metadata = { sessions, totalUsers, engagementRate, source, medium };

      await prisma.campaignMetric.upsert({
        where: {
          tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId, date },
        },
        update: {
          campaignName: campaignId,
          impressions: sessions,
          clicks: conversions, // GA4 conversions map to "clicks" as the meaningful action count
          spend: new Prisma.Decimal(0),
          conversions,
          revenue: new Prisma.Decimal(0),
          ctr: new Prisma.Decimal(engagementRate),
          cpc: new Prisma.Decimal(0),
          roas: new Prisma.Decimal(0),
          metadata: ga4Metadata,
        },
        create: {
          tenantId, integrationId, platform: "ga4",
          campaignId, campaignName: campaignId, date,
          impressions: sessions,
          clicks: conversions,
          spend: new Prisma.Decimal(0),
          conversions,
          revenue: new Prisma.Decimal(0),
          ctr: new Prisma.Decimal(engagementRate),
          cpc: new Prisma.Decimal(0),
          roas: new Prisma.Decimal(0),
          metadata: ga4Metadata,
        },
      });
      syncedCount++;
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), status: "active" },
    });

    await notifyIntegrationSync(tenantId, "ga4", true, `${syncedCount} registros sincronizados.`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GA4 Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    await notifyIntegrationSync(tenantId, "ga4", false, message);
    return { success: false, error: message };
  }
}

// ── TikTok Ads Sync ──────────────────────────────────────────────────────

export async function syncTikTokAds(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  const metadata = integration.metadata as { advertiserIds?: string[] } | null;
  const advertiserId = metadata?.advertiserIds?.[0];
  if (!advertiserId) return { success: false, error: "No advertiser ID found — reconnect TikTok" };

  try {
    const token = decrypt(integration.accessToken);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response: Response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
      {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          dimensions: ["campaign_id"],
          data_level: "AUCTION_CAMPAIGN",
          start_date: thirtyDaysAgo.toISOString().split("T")[0],
          end_date: now.toISOString().split("T")[0],
          metrics: ["spend", "impressions", "clicks", "conversion", "complete_payment"],
          page_size: 500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok API error ${response.status}: ${errorText}`);
    }

    const json: { code: number; message?: string; data?: { list?: Array<{ dimensions: { campaign_id: string }; metrics: Record<string, string> }> } } =
      await response.json();

    if (json.code !== 0) throw new Error(`TikTok API error: ${json.message || "Unknown"}`);

    const rows = json.data?.list ?? [];
    let syncedCount = 0;

    for (const row of rows) {
      const campaignId = row.dimensions.campaign_id;
      const impressions = parseInt(row.metrics.impressions || "0", 10);
      const clicks = parseInt(row.metrics.clicks || "0", 10);
      const spend = parseFloat(row.metrics.spend || "0");
      const conversions = parseInt(row.metrics.conversion || "0", 10);
      const revenue = parseFloat(row.metrics.complete_payment || "0");
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const roas = spend > 0 ? revenue / spend : 0;

      await prisma.campaignMetric.upsert({
        where: { tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId, date: now } },
        update: {
          campaignName: `TikTok Campaign ${campaignId}`, impressions, clicks,
          spend: new Prisma.Decimal(spend), conversions, revenue: new Prisma.Decimal(revenue),
          ctr: new Prisma.Decimal(ctr), cpc: new Prisma.Decimal(cpc), roas: new Prisma.Decimal(roas),
        },
        create: {
          tenantId, integrationId, platform: "tiktok",
          campaignId, campaignName: `TikTok Campaign ${campaignId}`, date: now,
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

    await notifyIntegrationSync(tenantId, "tiktok", true, `${syncedCount} campanas sincronizadas.`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[TikTok Sync] Failed:", message);
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "error" } });
    await notifyIntegrationSync(tenantId, "tiktok", false, message);
    return { success: false, error: message };
  }
}

// ── Instagram / Facebook Organic Content Sync ────────────────────────────

export async function syncMetaContentMetrics(tenantId: string, integrationId: string): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId },
  });

  if (!integration) return { success: false, error: "Integration not found" };

  try {
    const token = decrypt(integration.accessToken);
    const now = new Date();
    const sinceSec = Math.floor((now.getTime() - 30 * 86400000) / 1000);

    // Get Facebook Pages + linked Instagram accounts
    const pagesResp: Response = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&fields=id,name,instagram_business_account`
    );
    if (!pagesResp.ok) return { success: false, error: "Could not fetch Facebook pages" };

    const pagesData: { data?: Array<{ id: string; name: string; instagram_business_account?: { id: string } }> } =
      await pagesResp.json();

    let syncedCount = 0;

    for (const page of pagesData.data ?? []) {
      // Facebook Page organic insights
      const fbResp: Response = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}/insights?metric=page_impressions,page_engaged_users&period=day&since=${sinceSec}&access_token=${token}`
      );
      if (fbResp.ok) {
        const fb: { data?: Array<{ name: string; values: Array<{ value: number }> }> } = await fbResp.json();
        const impressions = fb.data?.find(d => d.name === "page_impressions")?.values?.slice(-1)[0]?.value ?? 0;
        const engaged = fb.data?.find(d => d.name === "page_engaged_users")?.values?.slice(-1)[0]?.value ?? 0;

        await prisma.campaignMetric.upsert({
          where: { tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId: `fb_page_${page.id}`, date: now } },
          update: { campaignName: `Facebook: ${page.name}`, impressions, clicks: engaged, spend: new Prisma.Decimal(0), conversions: 0, revenue: new Prisma.Decimal(0), ctr: new Prisma.Decimal(0), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0), metadata: { type: "organic_social", platform: "facebook" } },
          create: { tenantId, integrationId, platform: "facebook_organic", campaignId: `fb_page_${page.id}`, campaignName: `Facebook: ${page.name}`, date: now, impressions, clicks: engaged, spend: new Prisma.Decimal(0), conversions: 0, revenue: new Prisma.Decimal(0), ctr: new Prisma.Decimal(0), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0), metadata: { type: "organic_social", platform: "facebook" } },
        });
        syncedCount++;
      }

      // Instagram Business insights
      const igId = page.instagram_business_account?.id;
      if (igId) {
        const igResp: Response = await fetch(
          `https://graph.facebook.com/v21.0/${igId}/insights?metric=impressions,reach&period=day&since=${sinceSec}&access_token=${token}`
        );
        if (igResp.ok) {
          const ig: { data?: Array<{ name: string; values: Array<{ value: number }> }> } = await igResp.json();
          const igImpressions = ig.data?.find(d => d.name === "impressions")?.values?.slice(-1)[0]?.value ?? 0;
          const igReach = ig.data?.find(d => d.name === "reach")?.values?.slice(-1)[0]?.value ?? 0;

          await prisma.campaignMetric.upsert({
            where: { tenantId_integrationId_campaignId_date: { tenantId, integrationId, campaignId: `ig_${igId}`, date: now } },
            update: { campaignName: "Instagram", impressions: igImpressions, clicks: igReach, spend: new Prisma.Decimal(0), conversions: 0, revenue: new Prisma.Decimal(0), ctr: new Prisma.Decimal(0), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0), metadata: { type: "organic_social", platform: "instagram", reach: igReach } },
            create: { tenantId, integrationId, platform: "instagram_organic", campaignId: `ig_${igId}`, campaignName: "Instagram", date: now, impressions: igImpressions, clicks: igReach, spend: new Prisma.Decimal(0), conversions: 0, revenue: new Prisma.Decimal(0), ctr: new Prisma.Decimal(0), cpc: new Prisma.Decimal(0), roas: new Prisma.Decimal(0), metadata: { type: "organic_social", platform: "instagram", reach: igReach } },
          });
          syncedCount++;
        }
      }
    }

    if (syncedCount > 0) {
      await notifyIntegrationSync(tenantId, "meta_content", true, `${syncedCount} canales sincronizados.`);
    }
    return { success: true, synced: syncedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Meta Content Sync] Failed:", message);
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
    case "meta_ads": {
      const adsResult = await syncMetaAds(tenantId, integrationId);
      await syncMetaContentMetrics(tenantId, integrationId).catch(() => {});
      return adsResult;
    }
    case "google_ads":
      return syncGoogleAds(tenantId, integrationId);
    case "ga4":
      return syncGA4(tenantId, integrationId);
    case "tiktok":
      return syncTikTokAds(tenantId, integrationId);
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
