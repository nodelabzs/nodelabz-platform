import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import {
  createOAuthState,
  buildAuthorizationUrl,
} from "@/server/integrations/oauth";
import { metaOAuthConfig } from "@/server/integrations/meta/auth";
import {
  googleAdsOAuthConfig,
  ga4OAuthConfig,
  buildGoogleAuthUrl,
} from "@/server/integrations/google/auth";
import { buildTikTokAuthUrl } from "@/server/integrations/tiktok/auth";
import { buildShopifyAuthUrl } from "@/server/integrations/shopify/auth";
import { syncIntegration, syncAllIntegrations } from "@/server/integrations/sync";

export const integrationsRouter = router({
  /**
   * List all integrations for the current tenant.
   * Hides sensitive token fields.
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    const integrations = await prisma.integration.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { createdAt: "desc" },
    });

    return integrations.map((i) => ({
      id: i.id,
      platform: i.platform,
      accountId: i.accountId,
      status: i.status,
      lastSyncAt: i.lastSyncAt,
      metadata: i.metadata,
      createdAt: i.createdAt,
    }));
  }),

  /**
   * Start an OAuth flow for a given provider.
   * Returns the authorization URL to redirect the user to.
   */
  startOAuth: tenantProcedure
    .input(
      z.object({
        provider: z.enum(["meta_ads", "google_ads", "ga4", "tiktok", "shopify"]),
        shop: z.string().optional(), // Required for Shopify (e.g. "my-store.myshopify.com")
      })
    )
    .mutation(async ({ ctx, input }) => {
      const state = await createOAuthState({
        tenantId: ctx.effectiveTenantId,
        userId: ctx.dbUser.id,
        provider: input.provider,
      });

      let authUrl: string;

      switch (input.provider) {
        case "meta_ads":
          authUrl = buildAuthorizationUrl(metaOAuthConfig, state);
          break;
        case "google_ads":
          authUrl = buildGoogleAuthUrl(googleAdsOAuthConfig, state);
          break;
        case "ga4":
          authUrl = buildGoogleAuthUrl(ga4OAuthConfig, state);
          break;
        case "tiktok":
          authUrl = buildTikTokAuthUrl(state);
          break;
        case "shopify":
          if (!input.shop) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Shop domain is required for Shopify integration",
            });
          }
          authUrl = buildShopifyAuthUrl(input.shop, state);
          break;
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${input.provider} integration coming soon`,
          });
      }

      return { authUrl };
    }),

  /**
   * Disconnect (delete) an integration.
   */
  disconnect: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await prisma.integration.findFirst({
        where: {
          id: input.integrationId,
          tenantId: ctx.effectiveTenantId,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await prisma.integration.delete({
        where: { id: input.integrationId },
      });

      return { deleted: true };
    }),

  /**
   * Trigger a real sync for a single integration.
   * Fetches data from the platform API and stores in campaign_metrics.
   */
  syncNow: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await prisma.integration.findFirst({
        where: {
          id: input.integrationId,
          tenantId: ctx.effectiveTenantId,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      const result = await syncIntegration(ctx.effectiveTenantId, input.integrationId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Sync failed",
        });
      }

      return { triggered: true, synced: result.synced ?? 0 };
    }),

  /**
   * Sync all active integrations for the current tenant.
   */
  syncAll: tenantProcedure
    .mutation(async ({ ctx }) => {
      const { results } = await syncAllIntegrations(ctx.effectiveTenantId);
      return { results };
    }),

  /**
   * Get the sync status for an integration.
   */
  getSyncStatus: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const integration = await prisma.integration.findFirst({
        where: {
          id: input.integrationId,
          tenantId: ctx.effectiveTenantId,
        },
        select: {
          status: true,
          lastSyncAt: true,
          platform: true,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      return integration;
    }),
});
