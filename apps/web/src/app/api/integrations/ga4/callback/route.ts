import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { verifyOAuthState, exchangeCodeForTokens } from "@/server/integrations/oauth";
import {
  ga4OAuthConfig,
  getGA4Properties,
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

    if (oauthState.provider !== "ga4") {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_provider`
      );
    }

    // 2. Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } =
      await exchangeCodeForTokens(ga4OAuthConfig, code);

    // 3. Get GA4 properties
    const properties = await getGA4Properties(accessToken);

    // 4. Store integration in database
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000); // default 1 hour
    const primaryPropertyId = properties[0]?.propertyId || "";

    await prisma.integration.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: oauthState.tenantId,
          platform: "ga4",
          accountId: primaryPropertyId,
        },
      },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
        metadata: { properties },
        status: "active",
      },
      create: {
        tenantId: oauthState.tenantId,
        platform: "ga4",
        accessToken,
        refreshToken,
        accountId: primaryPropertyId,
        expiresAt,
        metadata: { properties },
        status: "active",
      },
    });

    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?platform=Google%20Analytics%204`
    );
  } catch (error) {
    console.error("[GA4 OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?error=${encodeURIComponent(message)}`
    );
  }
}
