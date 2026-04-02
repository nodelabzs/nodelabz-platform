import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { verifyOAuthState } from "@/server/integrations/oauth";
import {
  exchangeTikTokCode,
} from "@/server/integrations/tiktok/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("auth_code");
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

    if (oauthState.provider !== "tiktok") {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_provider`
      );
    }

    // 2. Exchange code for access token + advertiser IDs
    const { accessToken, advertiserIds } = await exchangeTikTokCode(code);

    // 3. Store integration in database
    const primaryAdvertiserId = advertiserIds[0] || null;

    await prisma.integration.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: oauthState.tenantId,
          platform: "tiktok",
          accountId: primaryAdvertiserId || "",
        },
      },
      update: {
        accessToken,
        expiresAt: null, // TikTok tokens are long-lived
        metadata: { advertiserIds },
        status: "active",
      },
      create: {
        tenantId: oauthState.tenantId,
        platform: "tiktok",
        accessToken,
        accountId: primaryAdvertiserId,
        expiresAt: null,
        metadata: { advertiserIds },
        status: "active",
      },
    });

    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?platform=TikTok`
    );
  } catch (error) {
    console.error("[TikTok OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?error=${encodeURIComponent(message)}`
    );
  }
}
