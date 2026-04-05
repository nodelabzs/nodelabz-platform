import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@nodelabz/db";

export const dynamic = "force-dynamic";

/**
 * Exchange the authorization code from WhatsApp Embedded Signup
 * for a long-lived access token, then store the integration.
 */
export async function POST(req: Request) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { tenantId: true },
  });
  if (!dbUser?.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  let body: { code: string; wabaId: string; phoneNumberId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, wabaId, phoneNumberId } = body;
  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json(
      { error: "Missing code, wabaId, or phoneNumberId" },
      { status: 400 }
    );
  }

  const appId = process.env.WHATSAPP_APP_ID || process.env.META_APP_ID;
  const appSecret =
    process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing app credentials" },
      { status: 500 }
    );
  }

  // Exchange code for access token
  const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    console.error("[whatsapp-exchange] Token exchange failed:", tokenData);
    return NextResponse.json(
      { error: tokenData.error?.message || "Token exchange failed" },
      { status: 400 }
    );
  }

  const accessToken = tokenData.access_token as string;

  // Get phone number details from Meta
  let displayPhone = "";
  try {
    const phoneRes = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
    );
    const phoneData = await phoneRes.json();
    displayPhone = phoneData.display_phone_number || "";
  } catch {
    // Non-critical, continue
  }

  // Subscribe the app to the WABA so we receive webhooks
  try {
    await fetch(
      `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("[whatsapp-exchange] Failed to subscribe to WABA:", err);
  }

  // Register the phone number for Cloud API
  try {
    await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin: "000000",
        }),
      }
    );
  } catch (err) {
    console.error("[whatsapp-exchange] Failed to register phone:", err);
  }

  // Upsert the integration
  const existing = await prisma.integration.findFirst({
    where: { tenantId: dbUser.tenantId, platform: "whatsapp" },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        accountId: phoneNumberId,
        accessToken,
        status: "active",
        metadata: {
          ...((existing.metadata as Record<string, unknown>) || {}),
          wabaId,
          displayPhone,
          connectedVia: "embedded_signup",
        },
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        tenantId: dbUser.tenantId,
        platform: "whatsapp",
        accountId: phoneNumberId,
        accessToken,
        status: "active",
        metadata: {
          wabaId,
          displayPhone,
          connectedVia: "embedded_signup",
        },
      },
    });
  }

  return NextResponse.json({ success: true, displayPhone, phoneNumberId });
}
