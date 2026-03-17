import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { verifyOAuthState, exchangeCodeForTokens } from "@/server/integrations/oauth";
import {
  googleAdsOAuthConfig,
  getAdCustomerIds,
} from "@/server/integrations/google/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=missing_params`
      );
    }

    // 1. Verify the state JWT
    const oauthState = await verifyOAuthState(state);

    if (oauthState.provider !== "google_ads") {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_provider`
      );
    }

    // 2. Exchange code for tokens (Google returns refresh_token on first auth)
    const { accessToken, refreshToken, expiresIn } =
      await exchangeCodeForTokens(googleAdsOAuthConfig, code);

    // 3. Get accessible customer IDs
    const customerIds = await getAdCustomerIds(accessToken);

    // 4. Store integration in database
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000); // default 1 hour
    const primaryCustomerId = customerIds[0] || "";

    await prisma.integration.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: oauthState.tenantId,
          platform: "google_ads",
          accountId: primaryCustomerId,
        },
      },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
        metadata: { customerIds },
        status: "active",
      },
      create: {
        tenantId: oauthState.tenantId,
        platform: "google_ads",
        accessToken,
        refreshToken,
        accountId: primaryCustomerId,
        expiresAt,
        metadata: { customerIds },
        status: "active",
      },
    });

    return NextResponse.redirect(
      `${baseUrl}/dashboard?integration_success=google_ads`
    );
  } catch (error) {
    console.error("[Google Ads OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=oauth_failed&detail=${encodeURIComponent(message)}`
    );
  }
}
