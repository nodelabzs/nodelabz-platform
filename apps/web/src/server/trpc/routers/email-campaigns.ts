import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { applyMergeTags } from "@/server/email/resend";
import { sendEmail } from "@/server/email/ses";

// ---------------------------------------------------------------------------
// Email tracking injection
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Inject open-tracking pixel and wrap links with click-tracking redirects.
 */
function injectTracking(
  html: string,
  campaignId: string,
  email: string
): string {
  const eid = encodeURIComponent(email);

  // 1. Wrap <a href="..."> links with click tracker (skip mailto: and #)
  const tracked = html.replace(
    /<a\s([^>]*?)href=["']([^"']+)["']/gi,
    (_match: string, prefix: string, href: string) => {
      if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("{")) {
        return `<a ${prefix}href="${href}"`;
      }
      const trackUrl = `${APP_URL}/api/track/click?cid=${campaignId}&eid=${eid}&url=${encodeURIComponent(href)}`;
      return `<a ${prefix}href="${trackUrl}"`;
    }
  );

  // 2. Inject tracking pixel before </body> or at the end
  const pixel = `<img src="${APP_URL}/api/track/open?cid=${campaignId}&eid=${eid}" width="1" height="1" alt="" style="display:none" />`;
  if (tracked.includes("</body>")) {
    return tracked.replace("</body>", `${pixel}</body>`);
  }
  return tracked + pixel;
}

export const emailCampaignsRouter = router({
  /**
   * List all campaigns for the tenant, including the template name.
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch template names for all campaigns
    const templateIds = [...new Set(campaigns.map((c) => c.templateId))];
    const templates = await prisma.emailTemplate.findMany({
      where: { id: { in: templateIds }, tenantId: ctx.effectiveTenantId },
      select: { id: true, name: true },
    });
    const templateMap = new Map(templates.map((t) => [t.id, t.name]));

    return campaigns.map((c) => ({
      ...c,
      templateName: templateMap.get(c.templateId) || "Desconocido",
    }));
  }),

  /**
   * Get a single campaign by id.
   */
  get: tenantProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id: input.campaignId, tenantId: ctx.effectiveTenantId },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campana no encontrada" });
      }
      return campaign;
    }),

  /**
   * Create a new campaign (draft status).
   */
  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.string().uuid(),
        segmentQuery: z.any().optional(),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify template exists
      const template = await prisma.emailTemplate.findFirst({
        where: { id: input.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      return prisma.emailCampaign.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          templateId: input.templateId,
          name: input.name,
          segmentQuery: input.segmentQuery || undefined,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          status: "draft",
        },
      });
    }),

  /**
   * Send a campaign immediately.
   * Fetches contacts matching the segment, applies merge fields, and marks as sent.
   */
  send: tenantProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id: input.campaignId, tenantId: ctx.effectiveTenantId },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campana no encontrada" });
      }
      if (campaign.status === "sent" || campaign.status === "sending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La campana ya fue enviada o esta en proceso",
        });
      }

      // Fetch template
      const template = await prisma.emailTemplate.findFirst({
        where: { id: campaign.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantilla asociada no encontrada",
        });
      }

      // Build contact query based on segmentQuery
      const segmentQuery = campaign.segmentQuery as Record<string, unknown> | null;
      const contactWhere: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
        email: { not: null },
      };

      if (segmentQuery) {
        if (segmentQuery.tags && Array.isArray(segmentQuery.tags)) {
          contactWhere.tags = { hasSome: segmentQuery.tags as string[] };
        }
        if (segmentQuery.scoreLabel) {
          contactWhere.scoreLabel = segmentQuery.scoreLabel;
        }
        if (segmentQuery.source) {
          contactWhere.source = segmentQuery.source;
        }
      }

      const contacts = await prisma.contact.findMany({
        where: contactWhere,
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
      });

      // Mark as sending
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "sending" },
      });

      // For each contact, prepare and send the personalized email via SES
      const baseHtml = template.html || "";
      const subject = template.subject || campaign.name;
      const eligibleContacts = contacts.filter((c) => c.email);

      let sent = 0;
      let failed = 0;

      for (const c of eligibleContacts) {
        const mergeFields: Record<string, string> = {
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          nombre: c.firstName || "",
          apellido: c.lastName || "",
          email: c.email || "",
          empresa: c.company || "",
        };

        try {
          const mergedHtml = applyMergeTags(baseHtml, mergeFields);
          const personalHtml = injectTracking(mergedHtml, campaign.id, c.email!);
          const personalSubject = applyMergeTags(subject, mergeFields);
          await sendEmail(c.email!, personalSubject, personalHtml);
          sent++;
        } catch (error) {
          console.error(
            `[Campaign ${campaign.id}] Failed to send to ${c.email}:`,
            error instanceof Error ? error.message : error
          );
          failed++;
        }
      }

      // Update campaign as sent with stats
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          stats: {
            sent,
            failed,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
          },
        },
      });

      return {
        campaignId: campaign.id,
        contactCount: eligibleContacts.length,
        sent,
        failed,
        status: "sent",
      };
    }),

  /**
   * Get campaign stats.
   */
  getStats: tenantProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id: input.campaignId, tenantId: ctx.effectiveTenantId },
        select: { id: true, name: true, status: true, sentAt: true, stats: true },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campana no encontrada" });
      }
      return campaign;
    }),

  /**
   * Schedule a campaign for later sending.
   */
  schedule: tenantProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id: input.campaignId, tenantId: ctx.effectiveTenantId },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campana no encontrada" });
      }
      if (campaign.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo campanas en borrador se pueden programar",
        });
      }

      return prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          scheduledAt: new Date(input.scheduledAt),
          status: "scheduled",
        },
      });
    }),
});
