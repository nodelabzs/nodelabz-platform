import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { syncIntegration } from "@/server/integrations/sync";

/**
 * Cron endpoint: syncs all active integrations across all tenants.
 *
 * Call this via:
 *   - Vercel Cron (vercel.json: { "crons": [{ "path": "/api/cron/sync-integrations", "schedule": "0 * * * *" }] })
 *   - External cron service (e.g., cron-job.org)
 *   - Trigger.dev scheduled task
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (skip in dev)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Find all active integrations that support sync
    const integrations = await prisma.integration.findMany({
      where: {
        status: { in: ["active", "expired"] },
        platform: { in: ["meta_ads", "google_ads", "ga4"] },
      },
      select: {
        id: true,
        tenantId: true,
        platform: true,
        lastSyncAt: true,
      },
    });

    console.log(`[Cron Sync] Found ${integrations.length} integrations to sync`);

    const results: Array<{ tenantId: string; platform: string; success: boolean; synced?: number; error?: string }> = [];

    for (const integration of integrations) {
      const result = await syncIntegration(integration.tenantId, integration.id);
      results.push({
        tenantId: integration.tenantId,
        platform: integration.platform,
        success: result.success,
        synced: result.synced,
        error: result.error,
      });
      console.log(
        `[Cron Sync] ${integration.platform} (${integration.tenantId}): ${result.success ? `synced ${result.synced} rows` : result.error}`
      );
    }

    return NextResponse.json({
      ok: true,
      synced: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("[Cron Sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
