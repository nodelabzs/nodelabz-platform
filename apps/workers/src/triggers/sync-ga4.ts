import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

interface GA4Row {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

async function refreshTokenIfNeeded(integration: {
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

export const syncGA4 = task({
  id: "sync-ga4",
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

    const propertyId = integration.accountId;
    if (!propertyId) {
      logger.error("No accountId (propertyId) on integration", { integrationId });
      return { success: false, error: "Missing accountId" };
    }

    try {
      // Step 2: Check/refresh token
      const accessToken = await refreshTokenIfNeeded(integration);

      // Step 3: Call GA4 Data API
      const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

      const response = await fetch(apiUrl, {
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GA4 API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rows: GA4Row[] = data.rows || [];

      logger.info("Fetched GA4 data", { rowCount: rows.length });

      // Step 4: Upsert each row into CampaignMetric
      // Dimensions: [date, sessionSource, sessionMedium]
      // Metrics: [sessions, totalUsers, conversions, engagementRate]
      let syncedCount = 0;

      for (const row of rows) {
        const dateStr = row.dimensionValues[0]?.value || "";
        const source = row.dimensionValues[1]?.value || "(direct)";
        const medium = row.dimensionValues[2]?.value || "(none)";

        const sessions = parseInt(row.metricValues[0]?.value || "0", 10);
        const totalUsers = parseInt(row.metricValues[1]?.value || "0", 10);
        const conversions = parseInt(row.metricValues[2]?.value || "0", 10);
        const engagementRate = parseFloat(row.metricValues[3]?.value || "0");

        // Use source/medium as the campaignId for GA4
        const campaignId = `${source} / ${medium}`;
        const campaignName = campaignId;

        // GA4 date format is YYYYMMDD
        const date = new Date(
          `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        );

        await prisma.campaignMetric.upsert({
          where: {
            tenantId_integrationId_campaignId_date: {
              tenantId,
              integrationId,
              campaignId,
              date,
            },
          },
          update: {
            campaignName,
            impressions: sessions, // sessions as proxy for impressions
            clicks: totalUsers, // totalUsers as proxy for clicks
            spend: new Prisma.Decimal(0),
            conversions,
            revenue: new Prisma.Decimal(0),
            ctr: new Prisma.Decimal(engagementRate),
            cpc: new Prisma.Decimal(0),
            roas: new Prisma.Decimal(0),
          },
          create: {
            tenantId,
            integrationId,
            platform: "ga4",
            campaignId,
            campaignName,
            date,
            impressions: sessions,
            clicks: totalUsers,
            spend: new Prisma.Decimal(0),
            conversions,
            revenue: new Prisma.Decimal(0),
            ctr: new Prisma.Decimal(engagementRate),
            cpc: new Prisma.Decimal(0),
            roas: new Prisma.Decimal(0),
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

      logger.info("GA4 sync complete", { tenantId, syncedCount });
      return { success: true, synced: syncedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("GA4 sync failed", { integrationId, error: message });

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "error" },
      });

      return { success: false, error: message };
    }
  },
});
