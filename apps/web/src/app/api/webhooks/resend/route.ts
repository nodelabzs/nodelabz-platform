import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    tags?: Record<string, string>;
    [key: string]: unknown;
  };
}

export async function POST(request: Request) {
  try {
    const event = (await request.json()) as ResendWebhookEvent;
    const eventType = event.type;
    const emailId = event.data?.email_id || "unknown";

    switch (eventType) {
      case "email.delivered":
        console.log(`[Resend Webhook] Email delivered: ${emailId}`);
        break;

      case "email.opened":
        console.log(`[Resend Webhook] Email opened: ${emailId}`);
        break;

      case "email.clicked":
        console.log(`[Resend Webhook] Email clicked: ${emailId}`);
        break;

      case "email.bounced":
        console.log(`[Resend Webhook] Email bounced: ${emailId}`);
        break;

      case "email.complained":
        console.log(`[Resend Webhook] Email complained: ${emailId}`);
        break;

      default:
        console.log(`[Resend Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Resend Webhook] Error processing event:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
