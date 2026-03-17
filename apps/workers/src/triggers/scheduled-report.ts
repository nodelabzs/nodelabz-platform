import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";

interface ScheduledReportPayload {
  tenantId: string;
  recipientEmail: string;
  period: "daily" | "weekly" | "monthly";
}

function computeDateRange(period: "daily" | "weekly" | "monthly"): {
  from: Date;
  to: Date;
} {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (period) {
    case "daily":
      from.setDate(from.getDate() - 1);
      break;
    case "weekly":
      from.setDate(from.getDate() - 7);
      break;
    case "monthly":
      from.setMonth(from.getMonth() - 1);
      break;
  }

  return { from, to };
}

export const scheduledReport = task({
  id: "scheduled-report",
  run: async (payload: ScheduledReportPayload) => {
    const { tenantId, recipientEmail, period } = payload;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      logger.error("Tenant not found", { tenantId });
      return { success: false, error: "Tenant not found" };
    }

    const { from, to } = computeDateRange(period);

    // Fetch metrics inline (same logic as pdf-generator, workers can't cross-import from web)
    const metrics = await prisma.campaignMetric.findMany({
      where: { tenantId, date: { gte: from, lte: to } },
    });

    const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
    const totalRevenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Aggregate by platform
    const byPlatform: Record<
      string,
      { spend: number; revenue: number; conversions: number; clicks: number }
    > = {};
    for (const m of metrics) {
      if (!byPlatform[m.platform])
        byPlatform[m.platform] = {
          spend: 0,
          revenue: 0,
          conversions: 0,
          clicks: 0,
        };
      const entry = byPlatform[m.platform]!;
      entry.spend += Number(m.spend);
      entry.revenue += Number(m.revenue);
      entry.conversions += m.conversions;
      entry.clicks += m.clicks;
    }

    const contactCount = await prisma.contact.count({ where: { tenantId } });
    const dealCount = await prisma.deal.count({ where: { tenantId } });

    const fromStr = from.toLocaleDateString("es-CR");
    const toStr = to.toLocaleDateString("es-CR");

    const periodLabel =
      period === "daily"
        ? "Diario"
        : period === "weekly"
          ? "Semanal"
          : "Mensual";

    // Build HTML email with report content
    const platformRows = Object.entries(byPlatform)
      .map(
        ([platform, data]) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${platform}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">$${data.spend.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">$${data.revenue.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${data.conversions}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${data.spend > 0 ? `${(data.revenue / data.spend).toFixed(1)}x` : "-"}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#1a1a1a;font-size:24px">Reporte ${periodLabel} - ${tenant.name}</h1>
        <p style="color:#666;font-size:14px">Periodo: ${fromStr} - ${toStr}</p>

        <div style="display:flex;gap:12px;margin:20px 0">
          <div style="background:#f8f8f8;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#1a1a1a">$${totalRevenue.toLocaleString()}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">Revenue</div>
          </div>
          <div style="background:#f8f8f8;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#1a1a1a">$${totalSpend.toLocaleString()}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">Gasto</div>
          </div>
          <div style="background:#f8f8f8;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#1a1a1a">${totalConversions}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">Conv.</div>
          </div>
          <div style="background:#f8f8f8;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#1a1a1a">${roas.toFixed(1)}x</div>
            <div style="font-size:12px;color:#888;margin-top:4px">ROAS</div>
          </div>
        </div>

        <h2 style="color:#1a1a1a;font-size:18px;margin-top:24px">Performance por Canal</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:8px;text-align:left">Canal</th>
              <th style="padding:8px;text-align:left">Gasto</th>
              <th style="padding:8px;text-align:left">Revenue</th>
              <th style="padding:8px;text-align:left">Conv.</th>
              <th style="padding:8px;text-align:left">ROAS</th>
            </tr>
          </thead>
          <tbody>${platformRows || '<tr><td colspan="5" style="padding:8px;color:#999">Sin datos en este periodo</td></tr>'}</tbody>
        </table>

        <h2 style="color:#1a1a1a;font-size:18px;margin-top:24px">Resumen CRM</h2>
        <p style="color:#333;font-size:14px">Contactos: <strong>${contactCount}</strong> | Deals: <strong>${dealCount}</strong></p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="color:#999;font-size:12px;text-align:center">Generado por NodeLabz | ${new Date().toLocaleDateString("es-CR")}</p>
      </div>`;

    // Send email via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.error("RESEND_API_KEY not configured");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const fromAddress =
      process.env.EMAIL_FROM || "NodeLabz <notifications@nodelabz.com>";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipientEmail,
          subject: `Reporte ${periodLabel} - ${tenant.name} (${fromStr} - ${toStr})`,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      logger.info("Scheduled report sent", {
        tenantId,
        recipientEmail,
        messageId: data.id,
      });

      // Create notification
      // Note: if Notification model doesn't exist yet, this is a no-op
      try {
        await (prisma as any).notification?.create?.({
          data: {
            tenantId,
            type: "report_sent",
            title: `Reporte ${periodLabel} enviado`,
            message: `Reporte enviado a ${recipientEmail}`,
          },
        });
      } catch {
        // Notification model may not exist yet - that's OK
        logger.info("Notification creation skipped (model may not exist)");
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Scheduled report email failed", {
        tenantId,
        recipientEmail,
        error: message,
      });
      return { success: false, error: message };
    }
  },
});
