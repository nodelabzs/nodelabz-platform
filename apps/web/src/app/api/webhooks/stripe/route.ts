import { NextResponse } from "next/server";
import { stripe } from "@/server/stripe/client";
import { prisma } from "@nodelabz/db";
import { PLAN_PRICES } from "@/server/stripe/plans";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/** Reverse-lookup: given a Stripe price ID, return the plan name */
function planFromPriceId(priceId: string): string | null {
  for (const [plan, id] of Object.entries(PLAN_PRICES)) {
    if (id === priceId) return plan;
  }
  return null;
}

async function updateTenantPlan(
  stripeCustomerId: string,
  plan: string,
  tenantIdOverride?: string
) {
  const whereClause = tenantIdOverride
    ? { id: tenantIdOverride }
    : { stripeCustomerId };

  await prisma.tenant.updateMany({
    where: whereClause,
    data: {
      plan: plan as "INICIO" | "CRECIMIENTO" | "PROFESIONAL" | "AGENCIA",
      ...(tenantIdOverride && !stripeCustomerId
        ? {}
        : { stripeCustomerId }),
    },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;

        if (plan && (customerId || tenantId)) {
          await updateTenantPlan(
            customerId || "",
            plan,
            tenantId || undefined
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Get the price ID from the first subscription item
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const plan = planFromPriceId(priceId);
          if (plan) {
            await updateTenantPlan(customerId, plan);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Downgrade to free plan
        await updateTenantPlan(customerId, "INICIO");
        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
