import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

interface TikTokReportRow {
  dimensions: {
    campaign_id: string;
    stat_time_day: string;
  };
  metrics: {
    campaign_name: string;
    impressions: string;
    clicks: string;
    spend: string;
    conversion: string;
    total_complete_payment_rate: string;
  };
}

export const syncTikTok = task({
  id: "sync-tiktok",
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

    const accountId = integration.accountId;
    if (!accountId) {
      logger.error("No accountId (advertiser_id) on integration", { integrationId });
      return { success: false, error: "Missing accountId" };
    }

    try {
      // Step 2: Call TikTok Reporting API
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      const allRows: TikTokReportRow[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Access-Token": integration.accessToken,
            },
            body: JSON.stringify({
              advertiser_id: accountId,
              report_type: "BASIC",
              dimensions: ["campaign_id", "stat_time_day"],
              metrics: [
                "campaign_name",
                "impressions",
                "clicks",
                "spend",
                "conversion",
                "total_complete_payment_rate",
              ],
              data_level: "AUCTION_CAMPAIGN",
              start_date: startDate,
              end_date: endDate,
              page_size: 1000,
              page,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TikTok API error ${response.status}: ${errorText}`);
        }

        const json = await response.json();

        if (json.code !== 0) {
          throw new Error(
            `TikTok API error: ${json.message || JSON.stringify(json)}`
          );
        }

        const rows: TikTokReportRow[] = json.data?.list ?? [];
        allRows.push(...rows);

        // Handle pagination
        const totalPage = json.data?.page_info?.total_page ?? 1;
        if (page >= totalPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      logger.info("Fetched TikTok report rows", { rowCount: allRows.length });

      // Step 3: Upsert each campaign x date row into CampaignMetric
      let syncedCount = 0;

      for (const row of allRows) {
        const impressions = parseInt(row.metrics.impressions, 10) || 0;
        const clicks = parseInt(row.metrics.clicks, 10) || 0;
        const spend = parseFloat(row.metrics.spend) || 0;
        const conversions = parseInt(row.metrics.conversion, 10) || 0;

        // TikTok doesn't provide revenue directly in basic reports
        const revenue = 0;

        // Calculate derived metrics
        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        const date = new Date(row.dimensions.stat_time_day);
        const campaignId = row.dimensions.campaign_id;
        const campaignName = row.metrics.campaign_name;

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
            platform: "tiktok",
            campaignId,
            campaignName,
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

      // Step 4: Update Integration lastSyncAt and status
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: "active",
        },
      });

      // Step 5: Return result
      logger.info("TikTok sync complete", { tenantId, syncedCount });
      return { success: true, synced: syncedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("TikTok sync failed", { integrationId, error: message });

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "error" },
      });

      return { success: false, error: message };
    }
  },
});
