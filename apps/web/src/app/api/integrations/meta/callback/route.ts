import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { verifyOAuthState, exchangeCodeForTokens } from "@/server/integrations/oauth";
import {
  metaOAuthConfig,
  exchangeForLongLivedToken,
  getAdAccounts,
} from "@/server/integrations/meta/auth";
import { encrypt } from "@/server/encryption";

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

    if (oauthState.provider !== "meta_ads") {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_provider`
      );
    }

    // 2. Exchange code for short-lived token
    const { accessToken: shortLivedToken } = await exchangeCodeForTokens(
      metaOAuthConfig,
      code
    );

    // 3. Exchange for long-lived token
    const { accessToken: longLivedToken, expiresIn } =
      await exchangeForLongLivedToken(shortLivedToken);

    // 4. Get ad accounts (graceful fallback if Meta API is slow)
    let adAccounts: Array<{ id: string; name: string; accountId: string }> = [];
    try {
      adAccounts = await getAdAccounts(longLivedToken);
    } catch (err) {
      console.warn("[Meta OAuth] Could not fetch ad accounts:", err instanceof Error ? err.message : err);
    }

    // 5. Store integration in database
    const expiresAt = new Date(Date.now() + (expiresIn || 5184000) * 1000);
    const primaryAccountId = adAccounts[0]?.accountId || null;

    const encryptedToken = encrypt(longLivedToken);

    await prisma.integration.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: oauthState.tenantId,
          platform: "meta_ads",
          accountId: primaryAccountId || "",
        },
      },
      update: {
        accessToken: encryptedToken,
        expiresAt,
        metadata: { adAccounts },
        status: "active",
      },
      create: {
        tenantId: oauthState.tenantId,
        platform: "meta_ads",
        accessToken: encryptedToken,
        accountId: primaryAccountId,
        expiresAt,
        metadata: { adAccounts },
        status: "active",
      },
    });

    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?platform=Meta%20Ads`
    );
  } catch (error) {
    console.error("[Meta OAuth Callback] Error:", error);
    const message =
      error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      `${baseUrl}/auth/oauth-success?error=${encodeURIComponent(message)}`
    );
  }
}
