import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { syncIntegration } from "./sync-integration";

/**
 * Scheduled task: syncs all active integrations every hour.
 * Uses batchTriggerAndWait for parallel execution instead of sequential.
 */
export const syncAllScheduled = schedules.task({
  id: "sync-all-integrations",
  run: async () => {
    const integrations = await prisma.integration.findMany({
      where: {
        status: { in: ["active", "expired"] },
        platform: { in: ["meta_ads", "google_ads", "ga4", "tiktok"] },
      },
      select: {
        id: true,
        tenantId: true,
        platform: true,
      },
    });

    logger.info("Starting scheduled sync", { count: integrations.length });

    if (integrations.length === 0) {
      return { succeeded: 0, failed: 0, total: 0 };
    }

    // Trigger all syncs in parallel (batch) instead of sequentially
    const batchItems = integrations.map((integration) => ({
      payload: {
        tenantId: integration.tenantId,
        integrationId: integration.id,
        platform: integration.platform,
      },
    }));

    try {
      const batchResult = await syncIntegration.batchTriggerAndWait(batchItems);

      let succeeded = 0;
      let failed = 0;
      for (const run of batchResult.runs) {
        if (run.ok) {
          succeeded++;
        } else {
          failed++;
        }
      }

      logger.info("Scheduled sync complete", { succeeded, failed, total: integrations.length });
      return { succeeded, failed, total: integrations.length };
    } catch (error) {
      logger.error("Batch sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { succeeded: 0, failed: integrations.length, total: integrations.length };
    }
  },
});
