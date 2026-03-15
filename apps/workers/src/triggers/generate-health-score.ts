import { task } from "@trigger.dev/sdk";

export const generateHealthScore = task({
  id: "generate-health-score",
  run: async (payload: { tenantId: string }) => {
    const { tenantId } = payload;

    // TODO: Collect metrics from all integrations
    // TODO: Calculate 5-pillar scores
    // TODO: Call AI service for insights
    // TODO: Store HealthScore record

    console.log(`Generating health score for tenant ${tenantId}`);

    return { success: true, tenantId };
  },
});
