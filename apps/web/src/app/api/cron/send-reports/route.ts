import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { sendEmail } from "@/server/email/ses";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ScheduleData {
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  reportType: string;
}

function isDue(frequency: ScheduleData["frequency"], now: Date): boolean {
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const dayOfMonth = now.getUTCDate();

  switch (frequency) {
    case "daily":
      return true;
    case "weekly":
      return dayOfWeek === 1; // Monday
    case "monthly":
      return dayOfMonth === 1;
    default:
      return false;
  }
}

function frequencyLabel(frequency: ScheduleData["frequency"]): string {
  switch (frequency) {
    case "daily":
      return "Diario";
    case "weekly":
      return "Semanal";
    case "monthly":
      return "Mensual";
  }
}

function getDateRange(frequency: ScheduleData["frequency"], now: Date) {
  const to = new Date(now);
  to.setUTCHours(0, 0, 0, 0);

  const from = new Date(to);
  switch (frequency) {
    case "daily":
      from.setUTCDate(from.getUTCDate() - 1);
      break;
    case "weekly":
      from.setUTCDate(from.getUTCDate() - 7);
      break;
    case "monthly":
      from.setUTCMonth(from.getUTCMonth() - 1);
      break;
  }

  return { from, to };
}

function fmt(n: number): string {
  return n.toLocaleString("es-CR");
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Metrics collector (mirrors pdf-generator logic)
// ---------------------------------------------------------------------------

async function collectMetrics(tenantId: string, from: Date, to: Date) {
  const [metrics, totalContacts, newContacts, dealsClosed, allDeals] =
    await Promise.all([
      prisma.campaignMetric.findMany({
        where: { tenantId, date: { gte: from, lte: to } },
      }),
      prisma.contact.count({ where: { tenantId } }),
      prisma.contact.count({
        where: { tenantId, createdAt: { gte: from, lte: to } },
      }),
      prisma.deal.count({
        where: { tenantId, closedAt: { gte: from, lte: to } },
      }),
      prisma.deal.findMany({
        where: { tenantId, closedAt: { gte: from, lte: to } },
        select: { value: true },
      }),
    ]);

  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
  const totalRevenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const closedRevenue = allDeals.reduce(
    (s, d) => s + Number(d.value ?? 0),
    0
  );

  // Simple health score: weighted blend of key metrics (0-100)
  const hasMetrics = metrics.length > 0;
  const roasScore = Math.min(roas / 3, 1) * 40; // 3x ROAS = max 40 pts
  const conversionScore = Math.min(totalConversions / 50, 1) * 30; // 50 conv = max 30 pts
  const dealScore = Math.min(dealsClosed / 10, 1) * 30; // 10 deals = max 30 pts
  const healthScore = hasMetrics
    ? Math.round(roasScore + conversionScore + dealScore)
    : 0;

  return {
    totalContacts,
    newContacts,
    dealsClosed,
    closedRevenue,
    totalSpend,
    totalRevenue,
    totalConversions,
    roas,
    healthScore,
  };
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function buildEmailHtml(
  tenantName: string,
  label: string,
  periodStr: string,
  m: Awaited<ReturnType<typeof collectMetrics>>
): string {
  const healthColor =
    m.healthScore >= 70 ? "#22c55e" : m.healthScore >= 40 ? "#eab308" : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">NodeLabz</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">Reporte ${label} &mdash; ${periodStr}</p>
          </td>
        </tr>

        <!-- Tenant -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0;font-size:14px;color:#71717a;">Negocio</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#18181b;">${tenantName}</p>
          </td>
        </tr>

        <!-- Health score -->
        <tr>
          <td style="padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;">
              <tr>
                <td style="padding:20px 24px;text-align:center;">
                  <span style="font-size:48px;font-weight:bold;color:${healthColor};">${m.healthScore}</span>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Health Score</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- KPI grid -->
        <tr>
          <td style="padding:8px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Total Contactos</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${fmt(m.totalContacts)}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Nuevos Contactos</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${fmt(m.newContacts)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Deals Cerrados</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${fmt(m.dealsClosed)}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Revenue (Deals)</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${fmtMoney(m.closedRevenue)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Revenue (Ads)</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${fmtMoney(m.totalRevenue)}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:8px;">
                  <table width="100%" style="background:#fafafa;border-radius:6px;">
                    <tr><td style="padding:16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">ROAS</p>
                      <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#18181b;">${m.roas.toFixed(1)}x</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
              Generado por NodeLabz &mdash; ${new Date().toLocaleDateString("es-CR")}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// Cron handler
// ---------------------------------------------------------------------------

/**
 * Cron endpoint: sends scheduled reports via email.
 *
 * Vercel Cron runs daily. The handler checks each schedule's frequency
 * against the current day to decide whether to send.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (skip in dev)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // Fetch all report schedules across all tenants
    const schedules = await prisma.aiMemory.findMany({
      where: { category: "report_schedule" },
    });

    console.log(`[Cron SendReports] Found ${schedules.length} schedules`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const schedule of schedules) {
      let data: ScheduleData;
      try {
        data = JSON.parse(schedule.value) as ScheduleData;
      } catch {
        console.error(`[Cron SendReports] Invalid schedule JSON: ${schedule.id}`);
        failed++;
        continue;
      }

      if (!isDue(data.frequency, now)) {
        skipped++;
        continue;
      }

      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: schedule.tenantId },
          select: { name: true },
        });

        const { from, to } = getDateRange(data.frequency, now);
        const metrics = await collectMetrics(schedule.tenantId, from, to);

        const label = frequencyLabel(data.frequency);
        const dateStr = now.toLocaleDateString("es-CR");
        const periodStr = `${from.toLocaleDateString("es-CR")} - ${to.toLocaleDateString("es-CR")}`;
        const subject = `NodeLabz \u2014 Reporte ${label} \u2014 ${dateStr}`;
        const html = buildEmailHtml(
          tenant?.name || "Tu negocio",
          label,
          periodStr,
          metrics
        );

        // Send to each recipient
        for (const recipient of data.recipients) {
          await sendEmail(recipient, subject, html);
        }

        sent++;
        console.log(
          `[Cron SendReports] Sent ${data.frequency} report for tenant ${schedule.tenantId} to ${data.recipients.length} recipients`
        );
      } catch (error) {
        failed++;
        console.error(
          `[Cron SendReports] Failed schedule ${schedule.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed });
  } catch (error) {
    console.error("[Cron SendReports] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
