import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import { sendTextMessage, sendTemplateMessage } from "@/server/integrations/whatsapp/client";
import { profesionalProcedure } from "../middleware/plan-gate";
import type { AutoReplyRule } from "@/server/integrations/whatsapp/auto-reply";
import { invokeModel } from "@/server/ai/router";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getWhatsAppIntegration(tenantId: string) {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, platform: "whatsapp", status: "active" },
  });

  if (!integration) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "WhatsApp integration not found. Please connect your WhatsApp Business account first.",
    });
  }

  return integration;
}

// ─── Auto-reply rule schema ──────────────────────────────────────────────────

const autoReplyRuleSchema = z.object({
  id: z.string(),
  keywords: z.array(z.string()),
  response: z.string(),
  businessHoursOnly: z.boolean(),
  enabled: z.boolean(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const whatsappRouter = router({
  /**
   * Connect or update WhatsApp Business credentials for the tenant.
   */
  connect: tenantProcedure
    .input(
      z.object({
        phoneNumberId: z.string().min(1),
        accessToken: z.string().min(1),
        displayPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      // Upsert the integration record
      const existing = await prisma.integration.findFirst({
        where: { tenantId, platform: "whatsapp" },
      });

      if (existing) {
        await prisma.integration.update({
          where: { id: existing.id },
          data: {
            accountId: input.phoneNumberId,
            accessToken: input.accessToken,
            status: "active",
            metadata: {
              ...((existing.metadata as Record<string, unknown>) || {}),
              displayPhone: input.displayPhone,
            },
          },
        });
        return { success: true, updated: true };
      }

      await prisma.integration.create({
        data: {
          tenantId,
          platform: "whatsapp",
          accountId: input.phoneNumberId,
          accessToken: input.accessToken,
          status: "active",
          metadata: { displayPhone: input.displayPhone },
        },
      });

      return { success: true, updated: false };
    }),

  /**
   * Disconnect WhatsApp integration for the tenant.
   */
  disconnect: tenantProcedure.mutation(async ({ ctx }) => {
    await prisma.integration.deleteMany({
      where: { tenantId: ctx.effectiveTenantId, platform: "whatsapp" },
    });
    return { success: true };
  }),

  /**
   * Get current WhatsApp connection status.
   */
  getConnection: tenantProcedure.query(async ({ ctx }) => {
    const integration = await prisma.integration.findFirst({
      where: { tenantId: ctx.effectiveTenantId, platform: "whatsapp", status: "active" },
    });
    if (!integration) return { connected: false };
    const meta = (integration.metadata as Record<string, unknown>) || {};
    return {
      connected: true,
      phoneNumberId: integration.accountId,
      displayPhone: (meta.displayPhone as string) || null,
    };
  }),

  /**
   * List conversations — distinct contacts with WhatsApp messages,
   * latest message and unread count per contact.
   */
  listConversations: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const tenantId = ctx.effectiveTenantId;

      // Get contacts that have at least one WhatsApp message
      const contactWhere: Record<string, unknown> = {
        tenantId,
        messages: { some: { channel: "WHATSAPP" } },
      };

      if (search) {
        contactWhere.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
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
            messages: {
              where: { channel: "WHATSAPP" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                content: true,
                direction: true,
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
          channel: "WHATSAPP",
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
        },
        lastMessage: c.messages[0] || null,
        unreadCount: unreadMap.get(c.id) || 0,
      }));

      return { conversations, total, page, totalPages: Math.ceil(total / limit) };
    }),

  /**
   * Get messages for a specific contact conversation.
   */
  getMessages: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { contactId, page, limit } = input;
      const tenantId = ctx.effectiveTenantId;

      // Verify the contact belongs to this tenant
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { contactId, tenantId, channel: "WHATSAPP" },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.message.count({
          where: { contactId, tenantId, channel: "WHATSAPP" },
        }),
      ]);

      // Mark inbound messages as read
      await prisma.message.updateMany({
        where: {
          contactId,
          tenantId,
          channel: "WHATSAPP",
          direction: "INBOUND",
          status: "received",
        },
        data: { status: "read" },
      });

      return { messages, total, page, totalPages: Math.ceil(total / limit) };
    }),

  /**
   * Send a text message to a contact.
   */
  send: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        message: z.string().min(1).max(4096),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
      if (!contact.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contact does not have a phone number",
        });
      }

      const integration = await getWhatsAppIntegration(tenantId);

      const { messageId } = await sendTextMessage({
        phoneNumberId: integration.accountId!,
        to: contact.phone,
        text: input.message,
        accessToken: integration.accessToken,
      });

      const record = await prisma.message.create({
        data: {
          tenantId,
          contactId: contact.id,
          channel: "WHATSAPP",
          direction: "OUTBOUND",
          content: input.message,
          metadata: { waMessageId: messageId },
          status: "sent",
        },
      });

      return { messageId, recordId: record.id };
    }),

  /**
   * Send a template message to a contact.
   */
  sendTemplate: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        templateName: z.string().min(1),
        languageCode: z.string().min(2).default("es"),
        params: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
      if (!contact.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contact does not have a phone number",
        });
      }

      const integration = await getWhatsAppIntegration(tenantId);

      const components = input.params && input.params.length > 0
        ? [
            {
              type: "body",
              parameters: input.params.map((text) => ({ type: "text", text })),
            },
          ]
        : undefined;

      const { messageId } = await sendTemplateMessage({
        phoneNumberId: integration.accountId!,
        to: contact.phone,
        templateName: input.templateName,
        languageCode: input.languageCode,
        components,
        accessToken: integration.accessToken,
      });

      const record = await prisma.message.create({
        data: {
          tenantId,
          contactId: contact.id,
          channel: "WHATSAPP",
          direction: "OUTBOUND",
          content: `[Template: ${input.templateName}]`,
          metadata: {
            waMessageId: messageId,
            templateName: input.templateName,
            languageCode: input.languageCode,
            params: input.params,
          },
          status: "sent",
        },
      });

      return { messageId, recordId: record.id };
    }),

  /**
   * Broadcast a template message to multiple contacts.
   * Requires PROFESIONAL plan.
   */
  broadcast: profesionalProcedure
    .input(
      z.object({
        contactIds: z.array(z.string().uuid()).min(1).max(500),
        templateName: z.string().min(1),
        languageCode: z.string().min(2).default("es"),
        params: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;
      const integration = await getWhatsAppIntegration(tenantId);

      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: input.contactIds },
          tenantId,
          phone: { not: null },
        },
      });

      const components = input.params && input.params.length > 0
        ? [
            {
              type: "body",
              parameters: input.params.map((text) => ({ type: "text", text })),
            },
          ]
        : undefined;

      const results: { contactId: string; success: boolean; error?: string }[] = [];

      for (const contact of contacts) {
        try {
          const { messageId } = await sendTemplateMessage({
            phoneNumberId: integration.accountId!,
            to: contact.phone!,
            templateName: input.templateName,
            languageCode: input.languageCode,
            components,
            accessToken: integration.accessToken,
          });

          await prisma.message.create({
            data: {
              tenantId,
              contactId: contact.id,
              channel: "WHATSAPP",
              direction: "OUTBOUND",
              content: `[Broadcast Template: ${input.templateName}]`,
              metadata: {
                waMessageId: messageId,
                templateName: input.templateName,
                languageCode: input.languageCode,
                params: input.params,
                broadcast: true,
              },
              status: "sent",
            },
          });

          results.push({ contactId: contact.id, success: true });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          results.push({ contactId: contact.id, success: false, error: errMsg });
        }
      }

      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const skipped = input.contactIds.length - contacts.length;

      return { sent, failed, skipped, results };
    }),

  /**
   * Get auto-reply rules from the WhatsApp integration metadata.
   */
  getAutoReplyRules: tenantProcedure.query(async ({ ctx }) => {
    const integration = await getWhatsAppIntegration(ctx.effectiveTenantId);
    const metadata = (integration.metadata as Record<string, unknown>) || {};
    const rules = (metadata.autoReplyRules || []) as AutoReplyRule[];
    return { rules };
  }),

  /**
   * Update auto-reply rules in the WhatsApp integration metadata.
   */
  updateAutoReplyRules: tenantProcedure
    .input(z.object({ rules: z.array(autoReplyRuleSchema) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getWhatsAppIntegration(ctx.effectiveTenantId);
      const existingMetadata =
        (integration.metadata as Record<string, unknown>) || {};

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          metadata: {
            ...existingMetadata,
            autoReplyRules: input.rules,
          },
        },
      });

      return { success: true, rulesCount: input.rules.length };
    }),

  /**
   * AI-powered lead qualification from WhatsApp conversation.
   */
  qualifyLead: tenantProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      // Verify contact belongs to this tenant
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      // Fetch last 20 WhatsApp messages
      const messages = await prisma.message.findMany({
        where: { contactId: input.contactId, tenantId, channel: "WHATSAPP" },
        orderBy: { createdAt: "asc" },
        take: 20,
      });

      if (messages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay mensajes de WhatsApp para analizar.",
        });
      }

      // Build conversation transcript
      const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const transcript = messages
        .map((m) => `${m.direction === "INBOUND" ? contactName : "Vendedor"}: ${m.content}`)
        .join("\n");

      const systemPrompt =
        "Eres un experto en ventas. Analiza esta conversacion de WhatsApp y determina:\n" +
        "1. Calificacion del lead (HOT si esta listo para comprar, WARM si tiene interes, COLD si no hay interes claro)\n" +
        "2. Razonamiento breve (1-2 frases)\n" +
        "3. Si sugieres crear un deal (solo si el lead mostro interes concreto en un producto/servicio)\n" +
        "4. Titulo y valor estimado del deal si aplica\n" +
        "Responde SOLO con JSON valido con esta estructura: { \"scoreLabel\": \"HOT\"|\"WARM\"|\"COLD\", \"reasoning\": string, \"suggestDeal\": boolean, \"dealTitle\"?: string, \"dealValue\"?: number }";

      const raw = await invokeModel({
        message: `Conversacion con ${contactName}:\n\n${transcript}`,
        systemPrompt,
        tier: "sonnet",
        maxTokens: 512,
      });

      // Parse AI response — extract JSON from potential markdown fences
      let analysis: {
        scoreLabel: "HOT" | "WARM" | "COLD";
        reasoning: string;
        suggestDeal: boolean;
        dealTitle?: string;
        dealValue?: number;
      };

      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        analysis = JSON.parse(jsonMatch[0]);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al procesar la respuesta de IA.",
        });
      }

      // Validate scoreLabel
      const validLabels = ["HOT", "WARM", "COLD"] as const;
      if (!validLabels.includes(analysis.scoreLabel)) {
        analysis.scoreLabel = "WARM";
      }

      // Update the contact's scoreLabel
      const scoreMap = { HOT: 90, WARM: 50, COLD: 10 };
      await prisma.contact.update({
        where: { id: input.contactId },
        data: {
          scoreLabel: analysis.scoreLabel,
          score: scoreMap[analysis.scoreLabel],
        },
      });

      return analysis;
    }),
});
