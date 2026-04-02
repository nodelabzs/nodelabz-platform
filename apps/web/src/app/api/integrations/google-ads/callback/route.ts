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

    // 3. Try to get accessible customer IDs (requires developer token)
    let customerIds: string[] = [];
    try {
      customerIds = await getAdCustomerIds(accessToken);
    } catch {
      // Developer token may not be set — continue without customer IDs
      console.warn("[Google Ads] Could not fetch customer IDs (developer token may be missing)");
    }

    // 4. Store integration in database
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000); // default 1 hour
    const primaryCustomerId = customerIds[0] || "pending";

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
      `${baseUrl}/auth/oauth-success?platform=Google%20Ads`
    );
  } catch (error) {
    console.error("[Google Ads OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?error=${encodeURIComponent(message)}`
    );
  }
}
