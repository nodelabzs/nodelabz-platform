import { NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { sendTextMessage } from "@/server/integrations/whatsapp/client";
import {
  findMatchingRule,
  isBusinessHours,
  type AutoReplyRule,
} from "@/server/integrations/whatsapp/auto-reply";

export const dynamic = "force-dynamic";

// ─── GET: Webhook Verification ───────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: Incoming Messages ─────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const entries = (body.entry as Array<Record<string, unknown>>) || [];

    for (const entry of entries) {
      const changes =
        (entry.changes as Array<Record<string, unknown>>) || [];

      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined;
        if (!value) continue;

        const metadata = value.metadata as
          | { phone_number_id?: string }
          | undefined;
        const phoneNumberId = metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const messages =
          (value.messages as Array<Record<string, unknown>>) || [];

        for (const msg of messages) {
          const from = msg.from as string | undefined;
          const waMessageId = msg.id as string | undefined;
          const timestamp = msg.timestamp as string | undefined;
          const type = msg.type as string | undefined;

          // Only handle text messages for now
          const textBody =
            type === "text"
              ? ((msg.text as { body?: string })?.body ?? "")
              : "";

          if (!from || !textBody) continue;

          // Find the integration by phoneNumberId to identify the tenant
          const integration = await prisma.integration.findFirst({
            where: {
              platform: "whatsapp",
              accountId: phoneNumberId,
              status: "active",
            },
          });

          if (!integration) {
            console.warn(
              `No WhatsApp integration found for phoneNumberId: ${phoneNumberId}`
            );
            continue;
          }

          const tenantId = integration.tenantId;

          // Find or create contact by phone number
          let contact = await prisma.contact.findFirst({
            where: { tenantId, phone: from },
          });

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                tenantId,
                firstName: from, // Use phone as name placeholder
                phone: from,
                source: "whatsapp",
                tags: [],
              },
            });
          }

          // Create inbound message record
          await prisma.message.create({
            data: {
              tenantId,
              contactId: contact.id,
              channel: "WHATSAPP",
              direction: "INBOUND",
              content: textBody,
              metadata: {
                waMessageId,
                from,
                timestamp,
                type,
              },
              status: "received",
            },
          });

          // Check auto-reply rules
          const autoReplyRules = (
            (integration.metadata as Record<string, unknown>) || {}
          ).autoReplyRules as AutoReplyRule[] | undefined;

          if (autoReplyRules && autoReplyRules.length > 0) {
            const matchedRule = findMatchingRule(textBody, autoReplyRules);

            if (matchedRule) {
              const shouldReply = matchedRule.businessHoursOnly
                ? isBusinessHours()
                : true;

              if (shouldReply) {
                const { messageId } = await sendTextMessage({
                  phoneNumberId,
                  to: from,
                  text: matchedRule.response,
                  accessToken: integration.accessToken,
                });

                // Record the auto-reply as outbound
                await prisma.message.create({
                  data: {
                    tenantId,
                    contactId: contact.id,
                    channel: "WHATSAPP",
                    direction: "OUTBOUND",
                    content: matchedRule.response,
                    metadata: {
                      waMessageId: messageId,
                      autoReply: true,
                      ruleId: matchedRule.id,
                    },
                    status: "sent",
                  },
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error processing WhatsApp webhook:", err);
    // Always return 200 to Meta so they don't retry excessively
  }

  return NextResponse.json({ received: true });
}
