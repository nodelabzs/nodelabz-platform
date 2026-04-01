import { OAuthConfig } from "../oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const googleAdsOAuthConfig: OAuthConfig = {
  provider: "google_ads",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  scopes: ["https://www.googleapis.com/auth/adwords"],
  redirectUri: `${APP_URL}/api/integrations/google-ads/callback`,
};

export const ga4OAuthConfig: OAuthConfig = {
  provider: "ga4",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  redirectUri: `${APP_URL}/api/integrations/ga4/callback`,
};

/**
 * Build Google authorization URL with access_type=offline and prompt=consent
 * to ensure we always receive a refresh token.
 */
export function buildGoogleAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    state,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
  });
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Refresh a Google access token using the refresh token.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * List accessible Google Ads customer IDs for the authenticated user.
 */
export async function getAdCustomerIds(
  accessToken: string
): Promise<string[]> {
  const response = await fetch(
    "https://googleads.googleapis.com/v19/customers:listAccessibleCustomers",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list Google Ads customers: ${error}`);
  }

  const data = await response.json();
  // resourceNames are like "customers/1234567890"
  return (data.resourceNames || []).map((name: string) =>
    name.replace("customers/", "")
  );
}

/**
 * List GA4 properties accessible to the authenticated user.
 */
export async function getGA4Properties(
  accessToken: string
): Promise<Array<{ propertyId: string; displayName: string }>> {
  const response = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list GA4 properties: ${error}`);
  }

  const data = await response.json();
  const properties: Array<{ propertyId: string; displayName: string }> = [];

  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      // prop.property is like "properties/123456"
      properties.push({
        propertyId: prop.property?.replace("properties/", "") || "",
        displayName: prop.displayName || account.displayName || "",
      });
    }
  }

  return properties;
}
