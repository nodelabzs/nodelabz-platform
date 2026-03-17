import { SignJWT, jwtVerify } from "jose";

const STATE_SECRET = new TextEncoder().encode(
  process.env.INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "oauth-state-secret"
);

export interface OAuthConfig {
  provider: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthState {
  tenantId: string;
  userId: string;
  provider: string;
}

export async function createOAuthState(state: OAuthState): Promise<string> {
  return new SignJWT({ ...state })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(STATE_SECRET);
}

export async function verifyOAuthState(token: string): Promise<OAuthState> {
  const { payload } = await jwtVerify(token, STATE_SECRET);
  return {
    tenantId: payload.tenantId as string,
    userId: payload.userId as string,
    provider: payload.provider as string,
  };
}

export function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(","),
    state,
    response_type: "code",
  });
  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
