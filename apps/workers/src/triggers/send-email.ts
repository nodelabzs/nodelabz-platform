import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";

/**
 * Send a single email via Resend API (direct fetch, no web-app dependency).
 */
export const sendEmail = task({
  id: "send-email",
  run: async (payload: {
    tenantId: string;
    campaignId?: string;
    to: string;
    subject: string;
    html: string;
    mergeFields?: Record<string, string>;
  }) => {
    const { tenantId, campaignId, to, subject, mergeFields } = payload;
    let { html } = payload;

    // Apply merge fields if provided
    if (mergeFields) {
      html = Object.entries(mergeFields).reduce(
        (text, [key, value]) =>
          text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
        html
      );
    }

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
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const messageId = data.id as string;

      logger.info("Email sent successfully", { to, messageId });

      // If tied to a campaign, increment sent count in stats
      if (campaignId) {
        const campaign = await prisma.emailCampaign.findFirst({
          where: { id: campaignId, tenantId },
        });

        if (campaign) {
          const currentStats = (campaign.stats as Record<string, number>) || {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
          };
          currentStats.sent = (currentStats.sent || 0) + 1;

          await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { stats: currentStats },
          });
        }
      }

      return { success: true, messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Email send failed", { to, error: message, tenantId });
      return { success: false, error: message };
    }
  },
});
