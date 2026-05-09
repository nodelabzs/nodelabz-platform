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

const VALID_STAT_FIELDS = ["delivered", "opened", "clicked", "bounced"] as const;

async function incrementStat(campaignId: string, field: (typeof VALID_STAT_FIELDS)[number]) {
  if (!VALID_STAT_FIELDS.includes(field)) return;
  // Use parameterized query — field is validated against whitelist above
  await prisma.$executeRaw`
    UPDATE "email_campaigns" SET stats = jsonb_set(
      COALESCE(stats, '{}')::jsonb,
      ${`{${field}}`}::text[],
      (COALESCE((stats->>${field})::int, 0) + 1)::text::jsonb
    ) WHERE id = ${campaignId}
  `;
}

async function tagContactByEmail(
  campaignId: string | null,
  email: string,
  tag: string,
) {
  // Scope to campaign's tenant to prevent cross-tenant tagging
  if (campaignId) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { tenantId: true },
    });
    if (campaign) {
      await prisma.contact.updateMany({
        where: { email, tenantId: campaign.tenantId },
        data: { tags: { push: tag } },
      });
      return;
    }
  }
  // Fallback: no campaign context, skip contact update to avoid cross-tenant leak
}

export async function POST(request: Request) {
  // Verify webhook secret if configured
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
    }
    // Timestamp replay protection: reject events older than 5 minutes
    const ts = parseInt(svixTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      return NextResponse.json({ error: "Webhook timestamp too old" }, { status: 401 });
    }
  }

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
        const bouncedTo = event.data?.to?.[0];
        if (bouncedTo) {
          await tagContactByEmail(campaignId, bouncedTo, "email_bounced");
        }
        break;
      }

      case "email.complained": {
        const complainedTo = event.data?.to?.[0];
        if (complainedTo) {
          await tagContactByEmail(campaignId, complainedTo, "email_complaint");
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
