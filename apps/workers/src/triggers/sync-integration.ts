import { task, logger } from "@trigger.dev/sdk";
import { syncMeta } from "./sync-meta";
import { syncGoogleAds } from "./sync-google-ads";
import { syncGA4 } from "./sync-ga4";
import { syncTikTok } from "./sync-tiktok";
import { syncShopify } from "./sync-shopify";

export const syncIntegration = task({
  id: "sync-integration",
  run: async (payload: { tenantId: string; integrationId: string; platform: string }) => {
    const { tenantId, integrationId, platform } = payload;

    logger.info("Dispatching integration sync", { tenantId, integrationId, platform });

    switch (platform) {
      case "meta_ads": {
        const result = await syncMeta.triggerAndWait({
          tenantId,
          integrationId,
        });

        return { success: true, platform, result, syncedAt: new Date().toISOString() };
      }

      case "google_ads": {
        const result = await syncGoogleAds.triggerAndWait({
          tenantId,
          integrationId,
        });

        return { success: true, platform, result, syncedAt: new Date().toISOString() };
      }

      case "ga4": {
        const result = await syncGA4.triggerAndWait({
          tenantId,
          integrationId,
        });

        return { success: true, platform, result, syncedAt: new Date().toISOString() };
      }

      case "tiktok": {
        const result = await syncTikTok.triggerAndWait({
          tenantId,
          integrationId,
        });

        return { success: true, platform, result, syncedAt: new Date().toISOString() };
      }

      case "shopify": {
        const result = await syncShopify.triggerAndWait({
          tenantId,
          integrationId,
        });

        return { success: true, platform, result, syncedAt: new Date().toISOString() };
      }

      default:
        logger.warn("Platform not yet supported", { platform });
        return { success: false, platform, error: `Platform "${platform}" not yet supported` };
    }
  },
});
