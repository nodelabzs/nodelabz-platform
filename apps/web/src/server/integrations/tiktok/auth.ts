const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const tiktokOAuthConfig = {
  provider: "tiktok",
  appId: process.env.TIKTOK_APP_ID || "",
  appSecret: process.env.TIKTOK_APP_SECRET || "",
  redirectUri: `${APP_URL}/api/integrations/tiktok/callback`,
};

/**
 * Build the TikTok OAuth authorization URL.
 * TikTok uses `app_id` instead of `client_id`.
 */
export function buildTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    app_id: tiktokOAuthConfig.appId,
    redirect_uri: tiktokOAuthConfig.redirectUri,
    state,
    response_type: "code",
  });
  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for a TikTok access token.
 * TikTok returns access_token and advertiser_ids in the response.
 */
export async function exchangeTikTokCode(authCode: string): Promise<{
  accessToken: string;
  advertiserIds: string[];
}> {
  const response = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: tiktokOAuthConfig.appId,
        secret: tiktokOAuthConfig.appSecret,
        auth_code: authCode,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok token exchange failed: ${errorText}`);
  }

  const json = await response.json();

  if (json.code !== 0) {
    throw new Error(
      `TikTok token exchange error: ${json.message || JSON.stringify(json)}`
    );
  }

  const data = json.data;
  return {
    accessToken: data.access_token,
    advertiserIds: data.advertiser_ids || [],
  };
}

/**
 * Get advertiser IDs associated with the access token.
 * Usually available directly from the token exchange response,
 * but can also be fetched separately.
 */
export async function getAdvertiserIds(
  accessToken: string
): Promise<string[]> {
  const response = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/",
    {
      method: "GET",
      headers: {
        "Access-Token": accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok advertiser IDs");
  }

  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(`TikTok advertiser fetch error: ${json.message}`);
  }

  return (json.data?.list || []).map(
    (adv: { advertiser_id: string }) => adv.advertiser_id
  );
}
