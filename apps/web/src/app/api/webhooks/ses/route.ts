import { NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types for AWS SNS / SES notifications
// ---------------------------------------------------------------------------

interface SNSMessage {
  Type: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  SubscribeURL?: string;
  Token?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
}

interface SESBounceNotification {
  notificationType: "Bounce";
  bounce: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
  };
  mail: SESMailObject;
}

interface SESComplaintNotification {
  notificationType: "Complaint";
  complaint: {
    complainedRecipients: Array<{ emailAddress: string }>;
    complaintFeedbackType?: string;
    timestamp: string;
    feedbackId: string;
  };
  mail: SESMailObject;
}

interface SESDeliveryNotification {
  notificationType: "Delivery";
  delivery: {
    recipients: string[];
    timestamp: string;
    processingTimeMillis: number;
    smtpResponse: string;
  };
  mail: SESMailObject;
}

interface SESMailObject {
  messageId: string;
  source: string;
  destination: string[];
  timestamp: string;
}

type SESNotification =
  | SESBounceNotification
  | SESComplaintNotification
  | SESDeliveryNotification;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SNSMessage;

    // ------------------------------------------------------------------
    // SNS Subscription Confirmation
    // ------------------------------------------------------------------
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      console.log("[SES Webhook] Confirming SNS subscription...");
      await fetch(body.SubscribeURL);
      return NextResponse.json({ confirmed: true }, { status: 200 });
    }

    // ------------------------------------------------------------------
    // SNS Notification (contains the SES event as a JSON string in Message)
    // ------------------------------------------------------------------
    if (body.Type === "Notification" && body.Message) {
      const notification = JSON.parse(body.Message) as SESNotification;

      switch (notification.notificationType) {
        case "Bounce":
          await handleBounce(notification);
          break;

        case "Complaint":
          await handleComplaint(notification);
          break;

        case "Delivery":
          console.log(
            `[SES Webhook] Delivery confirmed for: ${notification.delivery.recipients.join(", ")}`
          );
          break;

        default:
          console.log(
            `[SES Webhook] Unhandled notification type: ${(notification as SESNotification).notificationType}`
          );
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[SES Webhook] Error processing event:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

// ---------------------------------------------------------------------------
// Bounce handler
// ---------------------------------------------------------------------------

async function handleBounce(notification: SESBounceNotification) {
  const { bounce } = notification;
  const isPermanent = bounce.bounceType === "Permanent";

  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress;
    console.log(
      `[SES Webhook] Bounce (${bounce.bounceType}/${bounce.bounceSubType}) for: ${email}`
    );

    if (isPermanent) {
      // Tag the contact so they are excluded from future sends
      const contacts = await prisma.contact.findMany({
        where: { email },
        select: { id: true, tags: true },
      });

      for (const contact of contacts) {
        if (!contact.tags.includes("email_bounced")) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: { push: "email_bounced" } },
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Complaint handler
// ---------------------------------------------------------------------------

async function handleComplaint(notification: SESComplaintNotification) {
  const { complaint } = notification;

  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress;
    console.log(
      `[SES Webhook] Complaint (${complaint.complaintFeedbackType || "unknown"}) from: ${email}`
    );

    // Tag the contact to suppress future sends
    const contacts = await prisma.contact.findMany({
      where: { email },
      select: { id: true, tags: true },
    });

    for (const contact of contacts) {
      if (!contact.tags.includes("email_complaint")) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { tags: { push: "email_complaint" } },
        });
      }
    }
  }
}
