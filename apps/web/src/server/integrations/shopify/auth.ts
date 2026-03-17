import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const shopifyOAuthConfig = {
  provider: "shopify",
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecret: process.env.SHOPIFY_API_SECRET || "",
  scopes: "read_orders,read_products,read_customers",
  redirectUri: `${APP_URL}/api/integrations/shopify/callback`,
};

/**
 * Build the Shopify OAuth authorization URL.
 * Requires the shop domain as input (e.g. "my-store.myshopify.com").
 */
export function buildShopifyAuthUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: shopifyOAuthConfig.apiKey,
    scope: shopifyOAuthConfig.scopes,
    redirect_uri: shopifyOAuthConfig.redirectUri,
    state,
    response_type: "code",
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for a permanent Shopify access token.
 * Shopify tokens do not expire.
 */
export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<{ accessToken: string }> {
  const response = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: shopifyOAuthConfig.apiKey,
        client_secret: shopifyOAuthConfig.apiSecret,
        code,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
  };
}

/**
 * Verify the HMAC signature from Shopify callback query params.
 * Returns true if the signature is valid.
 */
export function verifyShopifyHmac(
  query: Record<string, string>
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;

  // Build the message from all query params except hmac
  const entries = Object.entries(query)
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b));

  const message = entries
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const computedHmac = crypto
    .createHmac("sha256", shopifyOAuthConfig.apiSecret)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac, "hex"),
    Buffer.from(computedHmac, "hex")
  );
}
