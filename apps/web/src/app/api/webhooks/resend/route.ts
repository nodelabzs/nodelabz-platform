import { NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";

export const dynamic = "force-dynamic";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    tags?: { name: string; value: string }[];
    [key: string]: unknown;
  };
}

function getCampaignIdFromTags(tags?: { name: string; value: string }[]): string | null {
  if (!tags) return null;
  const tag = tags.find((t) => t.name === "campaignId");
  return tag?.value || null;
}

async function incrementStat(campaignId: string, field: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE "email_campaigns" SET stats = jsonb_set(
      COALESCE(stats, '{}')::jsonb,
      $1::text[],
      (COALESCE((stats->>$2)::int, 0) + 1)::text::jsonb
    ) WHERE id = $3`,
    `{${field}}`,
    field,
    campaignId
  );
}

export async function POST(request: Request) {
  try {
    const event = (await request.json()) as ResendWebhookEvent;
    const eventType = event.type;
    const campaignId = getCampaignIdFromTags(event.data?.tags as { name: string; value: string }[] | undefined);

    switch (eventType) {
      case "email.delivered":
        if (campaignId) await incrementStat(campaignId, "delivered");
        break;

      case "email.opened":
        if (campaignId) await incrementStat(campaignId, "opened");
        break;

      case "email.clicked":
        if (campaignId) await incrementStat(campaignId, "clicked");
        break;

      case "email.bounced": {
        if (campaignId) await incrementStat(campaignId, "bounced");
        // Tag the contact as bounced
        const bouncedTo = event.data?.to?.[0];
        if (bouncedTo) {
          await prisma.contact.updateMany({
            where: { email: bouncedTo },
            data: { tags: { push: "email_bounced" } },
          });
        }
        break;
      }

      case "email.complained": {
        const complainedTo = event.data?.to?.[0];
        if (complainedTo) {
          await prisma.contact.updateMany({
            where: { email: complainedTo },
            data: { tags: { push: "email_complaint" } },
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Resend Webhook] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
