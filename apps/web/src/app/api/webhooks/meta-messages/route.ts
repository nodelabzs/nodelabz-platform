import { NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";

export const dynamic = "force-dynamic";

// ─── GET: Webhook Verification ───────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.META_MESSAGES_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: Incoming Messages from Facebook Messenger & Instagram DM ─────────

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const objectType = body.object as string | undefined; // "page" or "instagram"
    if (objectType !== "page" && objectType !== "instagram") {
      return NextResponse.json({ received: true });
    }

    const channel = objectType === "instagram" ? "INSTAGRAM_DM" : "FACEBOOK_DM";
    const platformKey =
      objectType === "instagram" ? "instagram_dm" : "facebook_dm";

    const entries = (body.entry as Array<Record<string, unknown>>) || [];

    for (const entry of entries) {
      const pageOrIgId = entry.id as string | undefined;
      const messagingEvents =
        (entry.messaging as Array<Record<string, unknown>>) || [];

      for (const event of messagingEvents) {
        const sender = event.sender as { id?: string } | undefined;
        const recipient = event.recipient as { id?: string } | undefined;
        const message = event.message as
          | { mid?: string; text?: string }
          | undefined;

        const senderId = sender?.id;
        const recipientId = recipient?.id;
        const text = message?.text;
        const messageId = message?.mid;

        // Only handle text messages for now
        if (!senderId || !text) continue;

        // Find the tenant by matching the page/instagram account ID
        // We look up by the recipient ID (our page) or the entry-level page ID
        const accountIdToMatch = recipientId || pageOrIgId;

        const integration = await prisma.integration.findFirst({
          where: {
            platform: platformKey,
            accountId: accountIdToMatch,
            status: "active",
          },
        });

        // Also try the meta_ads integration if no dedicated one found
        // (since Meta Ads OAuth stores the page token and account info)
        const effectiveIntegration =
          integration ??
          (await prisma.integration.findFirst({
            where: {
              platform: "meta_ads",
              accountId: accountIdToMatch,
              status: "active",
            },
          }));

        if (!effectiveIntegration) {
          console.warn(
            `No Meta integration found for ${platformKey} accountId: ${accountIdToMatch}`
          );
          continue;
        }

        const tenantId = effectiveIntegration.tenantId;

        // Find or create contact using sender ID as sourceId
        let contact = await prisma.contact.findFirst({
          where: { tenantId, sourceId: senderId, source: platformKey },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              tenantId,
              firstName: `${objectType === "instagram" ? "IG" : "FB"} User`,
              source: platformKey,
              sourceId: senderId,
              tags: [`${platformKey}-lead`, "auto-created"],
            },
          });

          await prisma.activity.create({
            data: {
              tenantId,
              contactId: contact.id,
              type: "contact_created",
              subject: `Contacto auto-creado desde ${objectType === "instagram" ? "Instagram DM" : "Facebook Messenger"}`,
              body: `Contacto creado automaticamente al recibir mensaje de ${platformKey}:${senderId}`,
              metadata: {
                source: platformKey,
                senderId,
              },
            },
          });
        }

        // Store the inbound message
        await prisma.message.create({
          data: {
            tenantId,
            contactId: contact.id,
            channel: channel as "INSTAGRAM_DM" | "FACEBOOK_DM",
            direction: "INBOUND",
            content: text,
            metadata: {
              messageId,
              senderId,
              recipientId,
              pageOrIgId,
              objectType,
            },
            status: "received",
          },
        });

        // TODO: Fire AI auto-reply when server/ai/auto-reply.ts is ready
        // import { handleAutoReply } from "@/server/ai/auto-reply";
        // await handleAutoReply({ tenantId, contactId: contact.id, channel, message: text });
      }
    }
  } catch (err) {
    console.error("Error processing Meta messages webhook:", err);
    // Always return 200 to Meta so they don't retry excessively
  }

  return NextResponse.json({ received: true });
}
