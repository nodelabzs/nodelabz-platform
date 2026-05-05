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

  if (campaignId && email) {
    try {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        select: { stats: true },
      });

      if (campaign) {
        const stats = (campaign.stats as Record<string, number>) || {};
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            stats: {
              ...stats,
              clicked: (stats.clicked || 0) + 1,
            },
          },
        });
      }
    } catch (error) {
      console.error("[Track Click] Error updating stats:", error);
    }
  }

  return NextResponse.redirect(targetUrl, 302);
}
