import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const campaignId = searchParams.get("cid");
  const email = searchParams.get("eid");

  // Always return the pixel, even if params are missing
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
              opened: (stats.opened || 0) + 1,
            },
          },
        });
      }
    } catch (error) {
      console.error("[Track Open] Error updating stats:", error);
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
