import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

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

export const syncMeta = task({
  id: "sync-meta",
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

    // Step 2: Check token expiry
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      logger.warn("Meta access token expired", { integrationId });
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "expired" },
      });
      return { success: false, error: "Token expired" };
    }

    const accountId = integration.accountId;
    if (!accountId) {
      logger.error("No accountId on integration", { integrationId });
      return { success: false, error: "Missing accountId" };
    }

    try {
      // Step 3: Call Meta Marketing API
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
      let url: string | null =
        `https://graph.facebook.com/v21.0/act_${accountId}/insights?${params.toString()}`;

      while (url) {
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Meta API error ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        const rows: MetaInsightRow[] = json.data ?? [];
        allRows.push(...rows);

        // Handle pagination
        url = json.paging?.next ?? null;
      }

      logger.info("Fetched Meta insights", { rowCount: allRows.length });

      // Step 4: Upsert each campaign x date row into CampaignMetric
      let syncedCount = 0;

      for (const row of allRows) {
        const impressions = parseInt(row.impressions, 10) || 0;
        const clicks = parseInt(row.clicks, 10) || 0;
        const spend = parseFloat(row.spend) || 0;

        // Count conversions: actions where action_type contains "lead" or "offsite_conversion"
        const conversions = (row.actions ?? [])
          .filter(
            (a) =>
              a.action_type.includes("lead") ||
              a.action_type.includes("offsite_conversion")
          )
          .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0);

        // Sum revenue: action_values where action_type contains "purchase"
        const revenue = (row.action_values ?? [])
          .filter((a) => a.action_type.includes("purchase"))
          .reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);

        // Calculate derived metrics
        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        const date = new Date(row.date_start);

        await prisma.campaignMetric.upsert({
          where: {
            tenantId_integrationId_campaignId_date: {
              tenantId,
              integrationId,
              campaignId: row.campaign_id,
              date,
            },
          },
          update: {
            campaignName: row.campaign_name,
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
            platform: "meta_ads",
            campaignId: row.campaign_id,
            campaignName: row.campaign_name,
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

      // Step 6: Return result
      logger.info("Meta sync complete", { tenantId, syncedCount });
      return { success: true, synced: syncedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Meta sync failed", { integrationId, error: message });

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "error" },
      });

      return { success: false, error: message };
    }
  },
});
