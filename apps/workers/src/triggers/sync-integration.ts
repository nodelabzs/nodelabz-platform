import { task } from "@trigger.dev/sdk";
import { z } from "zod";

export const syncIntegration = task({
  id: "sync-integration",
  run: async (payload: { tenantId: string; integrationId: string; platform: string }) => {
    const { tenantId, integrationId, platform } = payload;

    // TODO: Implement per-platform sync logic
    console.log(`Syncing ${platform} for tenant ${tenantId}, integration ${integrationId}`);

    return { success: true, platform, syncedAt: new Date().toISOString() };
  },
});
