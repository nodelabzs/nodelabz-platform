import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { verifyOAuthState } from "@/server/integrations/oauth";
import {
  exchangeShopifyCode,
  verifyShopifyHmac,
} from "@/server/integrations/shopify/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    if (!code || !state || !shop) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=missing_params`
      );
    }

    // 1. Verify Shopify HMAC signature
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    if (!verifyShopifyHmac(queryObj)) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_hmac`
      );
    }

    // 2. Verify the state JWT
    const oauthState = await verifyOAuthState(state);

    if (oauthState.provider !== "shopify") {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_provider`
      );
    }

    // 3. Exchange code for permanent access token
    const { accessToken } = await exchangeShopifyCode(shop, code);

    // 4. Store integration in database (Shopify tokens don't expire)
    await prisma.integration.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: oauthState.tenantId,
          platform: "shopify",
          accountId: shop,
        },
      },
      update: {
        accessToken,
        expiresAt: null, // Shopify tokens don't expire
        metadata: { shop },
        status: "active",
      },
      create: {
        tenantId: oauthState.tenantId,
        platform: "shopify",
        accessToken,
        accountId: shop,
        expiresAt: null,
        metadata: { shop },
        status: "active",
      },
    });

    return NextResponse.redirect(
      `${baseUrl}/dashboard?integration_success=shopify`
    );
  } catch (error) {
    console.error("[Shopify OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=oauth_failed&detail=${encodeURIComponent(message)}`
    );
  }
}
