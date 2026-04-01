import { OAuthConfig } from "../oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metaOAuthConfig: OAuthConfig = {
  provider: "meta_ads",
  authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
  clientId: process.env.META_APP_ID || "",
  clientSecret: process.env.META_APP_SECRET || "",
  scopes: ["ads_read", "ads_management"],
  redirectUri: `${APP_URL}/api/integrations/meta/callback`,
};

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params}`
  );
  if (!response.ok) throw new Error("Failed to exchange for long-lived token");

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // ~60 days
  };
}

export async function getAdAccounts(
  accessToken: string
): Promise<Array<{ id: string; name: string; accountId: string }>> {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
  );
  if (!response.ok) throw new Error("Failed to fetch ad accounts");

  const data = await response.json();
  return (data.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    accountId: acc.account_id,
  }));
}
