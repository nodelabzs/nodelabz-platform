import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { rateLimit, getClientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`track:click:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const campaignId = searchParams.get("cid");
  const email = searchParams.get("eid");
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const targetUrl = decodeURIComponent(url);

  // Prevent open redirect — only allow http(s) URLs
  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (campaignId && email) {
    try {
      await prisma.$executeRaw`
        UPDATE "email_campaigns"
        SET stats = jsonb_set(
          COALESCE(stats, '{}')::jsonb,
          '{clicked}',
          (COALESCE((stats->>'clicked')::int, 0) + 1)::text::jsonb
        )
        WHERE id = ${campaignId}
      `;
    } catch (error) {
      console.error("[Track Click] Error updating stats:", error);
    }
  }

  return NextResponse.redirect(targetUrl, 302);
}
