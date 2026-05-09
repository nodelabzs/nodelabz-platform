import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";

/**
 * Cron endpoint: permanently deletes soft-deleted contacts and deals
 * older than 30 days.
 *
 * Schedule: daily at 3:00 AM UTC
 * Vercel cron: { "path": "/api/cron/purge-trash", "schedule": "0 3 * * *" }
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Permanently delete contacts soft-deleted more than 30 days ago
    const deletedContacts = await prisma.contact.deleteMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
    });

    // Permanently delete deals soft-deleted more than 30 days ago
    const deletedDeals = await prisma.deal.deleteMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      purged: {
        contacts: deletedContacts.count,
        deals: deletedDeals.count,
      },
      threshold: thirtyDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("[Cron] purge-trash error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
