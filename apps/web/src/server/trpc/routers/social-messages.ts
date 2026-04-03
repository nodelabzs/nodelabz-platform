import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import {
  sendFacebookMessage,
  sendInstagramMessage,
} from "@/server/integrations/meta/messages";

// Channels handled by this router
const SOCIAL_CHANNELS = ["WHATSAPP", "INSTAGRAM_DM", "FACEBOOK_DM"] as const;

const channelFilterSchema = z
  .enum(["WHATSAPP", "INSTAGRAM_DM", "FACEBOOK_DM"])
  .optional();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getMetaIntegration(
  tenantId: string,
  channel: "INSTAGRAM_DM" | "FACEBOOK_DM"
) {
  const platformKey = channel === "INSTAGRAM_DM" ? "instagram_dm" : "facebook_dm";

  // Try dedicated integration first, then fall back to meta_ads
  const integration =
    (await prisma.integration.findFirst({
      where: { tenantId, platform: platformKey, status: "active" },
    })) ??
    (await prisma.integration.findFirst({
      where: { tenantId, platform: "meta_ads", status: "active" },
    }));

  if (!integration) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No Meta integration found for ${channel}. Please connect your account first.`,
    });
  }

  return integration;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const socialMessagesRouter = router({
  /**
   * List conversations across social channels (WhatsApp + Instagram DM + Facebook DM).
   * Optionally filter by a specific channel.
   */
  listConversations: tenantProcedure
    .input(
      z.object({
        channel: channelFilterSchema,
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { channel, page, limit, search } = input;
      const tenantId = ctx.effectiveTenantId;

      const channelsToQuery = channel ? [channel] : [...SOCIAL_CHANNELS];

      const contactWhere: Record<string, unknown> = {
        tenantId,
        messages: { some: { channel: { in: channelsToQuery } } },
      };

      if (search) {
        contactWhere.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { sourceId: { contains: search, mode: "insensitive" } },
        ];
      }

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where: contactWhere,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            source: true,
            sourceId: true,
            messages: {
              where: { channel: { in: channelsToQuery } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                content: true,
                direction: true,
                channel: true,
                createdAt: true,
                status: true,
              },
            },
          },
        }),
        prisma.contact.count({ where: contactWhere }),
      ]);

      // Get unread counts
      const contactIds = contacts.map((c) => c.id);
      const unreadCounts = await prisma.message.groupBy({
        by: ["contactId"],
        where: {
          tenantId,
          channel: { in: channelsToQuery },
          direction: "INBOUND",
          status: "received",
          contactId: { in: contactIds },
        },
        _count: { id: true },
      });

      const unreadMap = new Map(
        unreadCounts.map((u) => [u.contactId, u._count.id])
      );

      const conversations = contacts.map((c) => ({
        contact: {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          source: c.source,
          sourceId: c.sourceId,
        },
        lastMessage: c.messages[0] || null,
        unreadCount: unreadMap.get(c.id) || 0,
      }));

      return {
        conversations,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get messages for a specific contact conversation across social channels.
   */
  getMessages: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        channel: channelFilterSchema,
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { contactId, channel, page, limit } = input;
      const tenantId = ctx.effectiveTenantId;

      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      const channelsToQuery = channel ? [channel] : [...SOCIAL_CHANNELS];

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: {
            contactId,
            tenantId,
            channel: { in: channelsToQuery },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.message.count({
          where: {
            contactId,
            tenantId,
            channel: { in: channelsToQuery },
          },
        }),
      ]);

      // Mark inbound messages as read
      await prisma.message.updateMany({
        where: {
          contactId,
          tenantId,
          channel: { in: channelsToQuery },
          direction: "INBOUND",
          status: "received",
        },
        data: { status: "read" },
      });

      return { messages, total, page, totalPages: Math.ceil(total / limit) };
    }),

  /**
   * Send a message via Facebook Messenger or Instagram DM.
   */
  send: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        channel: z.enum(["INSTAGRAM_DM", "FACEBOOK_DM"]),
        message: z.string().min(1).max(4096),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      if (!contact.sourceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Contact does not have a social media ID (sourceId) to send messages to.",
        });
      }

      const integration = await getMetaIntegration(tenantId, input.channel);

      const sendFn =
        input.channel === "INSTAGRAM_DM"
          ? sendInstagramMessage
          : sendFacebookMessage;

      const result = await sendFn(
        integration.accessToken,
        contact.sourceId,
        input.message
      );

      const record = await prisma.message.create({
        data: {
          tenantId,
          contactId: contact.id,
          channel: input.channel,
          direction: "OUTBOUND",
          content: input.message,
          metadata: {
            messageId: result.messageId,
            recipientId: result.recipientId,
          },
          status: "sent",
        },
      });

      return { messageId: result.messageId, recordId: record.id };
    }),
});
