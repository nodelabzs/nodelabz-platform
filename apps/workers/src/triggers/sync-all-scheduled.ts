import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { syncIntegration } from "./sync-integration";

/**
 * Scheduled task: syncs all active integrations every hour.
 * Configure in Trigger.dev dashboard or via code:
 *   schedules.create({ task: "sync-all-integrations", cron: "0 * * * *" })
 */
export const syncAllScheduled = schedules.task({
  id: "sync-all-integrations",
  run: async () => {
    const integrations = await prisma.integration.findMany({
      where: {
        status: { in: ["active", "expired"] },
        platform: { in: ["meta_ads", "google_ads", "ga4"] },
      },
      select: {
        id: true,
        tenantId: true,
        platform: true,
      },
    });

    logger.info("Starting scheduled sync", { count: integrations.length });

    const results: Array<{ tenantId: string; platform: string; success: boolean }> = [];

    for (const integration of integrations) {
      try {
        const result = await syncIntegration.triggerAndWait({
          tenantId: integration.tenantId,
          integrationId: integration.id,
          platform: integration.platform,
        });

        results.push({
          tenantId: integration.tenantId,
          platform: integration.platform,
          success: !!result?.ok && (result.ok as any).success,
        });
      } catch (error) {
        logger.error("Sync failed for integration", {
          integrationId: integration.id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({
          tenantId: integration.tenantId,
          platform: integration.platform,
          success: false,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info("Scheduled sync complete", { succeeded, failed, total: results.length });

    return { succeeded, failed, total: results.length };
  },
});
