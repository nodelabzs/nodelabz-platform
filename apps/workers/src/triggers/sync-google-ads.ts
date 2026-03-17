import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

const GOOGLE_ADS_API_VERSION = "v18";

interface GoogleAdsRow {
  campaign: {
    id: string;
    name: string;
  };
  segments: {
    date: string;
  };
  metrics: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: number;
    conversionsValue: number;
  };
}

async function refreshTokenIfNeeded(integration: {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<string> {
  // If token hasn't expired, return current one
  if (integration.expiresAt && integration.expiresAt > new Date()) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    throw new Error("Token expired and no refresh token available");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: integration.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  const data = await response.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: data.access_token,
      expiresAt: newExpiresAt,
    },
  });

  return data.access_token;
}

export const syncGoogleAds = task({
  id: "sync-google-ads",
  run: async (payload: { tenantId: string; integrationId: string }) => {
    const { tenantId, integrationId } = payload;

    // Step 1: Fetch Integration record
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      logger.error("Integration not found", { integrationId, tenantId });
      return { success: false, error: "Integration not found" };
    }

    const customerId = integration.accountId;
    if (!customerId) {
      logger.error("No accountId (customerId) on integration", { integrationId });
      return { success: false, error: "Missing accountId" };
    }

    try {
      // Step 2: Check/refresh token
      const accessToken = await refreshTokenIfNeeded(integration);

      // Step 3: Call Google Ads API via REST searchStream
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
      `.trim();

      const apiUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Ads API error ${response.status}: ${errorText}`);
      }

      const results = await response.json();

      // searchStream returns an array of batches
      const allRows: GoogleAdsRow[] = [];
      for (const batch of results) {
        if (batch.results) {
          allRows.push(...batch.results);
        }
      }

      logger.info("Fetched Google Ads data", { rowCount: allRows.length });

      // Step 4: Upsert each campaign x date row into CampaignMetric
      let syncedCount = 0;

      for (const row of allRows) {
        const impressions = parseInt(row.metrics.impressions, 10) || 0;
        const clicks = parseInt(row.metrics.clicks, 10) || 0;
        const costMicros = parseInt(row.metrics.costMicros, 10) || 0;
        const spend = costMicros / 1_000_000;
        const conversions = row.metrics.conversions || 0;
        const revenue = row.metrics.conversionsValue || 0;

        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        const date = new Date(row.segments.date);

        await prisma.campaignMetric.upsert({
          where: {
            tenantId_integrationId_campaignId_date: {
              tenantId,
              integrationId,
              campaignId: row.campaign.id,
              date,
            },
          },
          update: {
            campaignName: row.campaign.name,
            impressions,
            clicks,
            spend: new Prisma.Decimal(spend),
            conversions,
            revenue: new Prisma.Decimal(revenue),
            ctr: new Prisma.Decimal(ctr),
            cpc: new Prisma.Decimal(cpc),
            roas: new Prisma.Decimal(roas),
          },
          create: {
            tenantId,
            integrationId,
            platform: "google_ads",
            campaignId: row.campaign.id,
            campaignName: row.campaign.name,
            date,
            impressions,
            clicks,
            spend: new Prisma.Decimal(spend),
            conversions,
            revenue: new Prisma.Decimal(revenue),
            ctr: new Prisma.Decimal(ctr),
            cpc: new Prisma.Decimal(cpc),
            roas: new Prisma.Decimal(roas),
          },
        });

        syncedCount++;
      }

      // Step 5: Update Integration lastSyncAt and status
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: "active",
        },
      });

      logger.info("Google Ads sync complete", { tenantId, syncedCount });
      return { success: true, synced: syncedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Google Ads sync failed", { integrationId, error: message });

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "error" },
      });

      return { success: false, error: message };
    }
  },
});
