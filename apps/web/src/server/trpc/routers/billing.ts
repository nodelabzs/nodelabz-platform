import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { stripe } from "@/server/stripe/client";
import {
  PLAN_PRICES,
  PLAN_LIMITS,
  type PlanName,
} from "@/server/stripe/plans";

export const billingRouter = router({
  /**
   * Get current subscription status for the tenant.
   */
  getSubscription: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: {
        plan: true,
        stripeCustomerId: true,
        trialEndsAt: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant no encontrado" });
    }

    if (!tenant.stripeCustomerId) {
      return {
        plan: tenant.plan,
        status: "no_subscription" as const,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: tenant.stripeCustomerId,
        status: "all",
        limit: 1,
      });

      const sub = subscriptions.data[0];
      if (!sub) {
        return {
          plan: tenant.plan,
          status: "no_subscription" as const,
          trialEndsAt: tenant.trialEndsAt,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }

      // In Stripe v20 (clover), current_period_end is on the subscription item
      const itemPeriodEnd = sub.items.data[0]?.current_period_end;

      return {
        plan: tenant.plan,
        status: sub.status,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: itemPeriodEnd
          ? new Date(itemPeriodEnd * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    } catch {
      return {
        plan: tenant.plan,
        status: "error" as const,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }),

  /**
   * Create a Stripe Checkout session for upgrading/subscribing.
   */
  createCheckout: tenantProcedure
    .input(
      z.object({
        plan: z.enum(["INICIO", "CRECIMIENTO", "PROFESIONAL", "AGENCIA"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.effectiveTenantId },
        select: { id: true, name: true, stripeCustomerId: true },
      });

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant no encontrado" });
      }

      // Create Stripe customer if it doesn't exist
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: tenant.name,
          metadata: { tenantId: tenant.id },
        });
        customerId = customer.id;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceId = PLAN_PRICES[input.plan];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/dashboard?billing=success`,
        cancel_url: `${baseUrl}/dashboard?billing=canceled`,
        metadata: { tenantId: tenant.id, plan: input.plan },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo crear la sesion de checkout",
        });
      }

      return { url: session.url };
    }),

  /**
   * Create a Stripe billing portal session for managing subscription.
   */
  createPortalSession: tenantProcedure.mutation(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: { stripeCustomerId: true },
    });

    if (!tenant?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No hay suscripcion activa para gestionar",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });

    return { url: session.url };
  }),

  /**
   * Get current usage metrics for the tenant.
   */
  getUsage: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant no encontrado" });
    }

    const plan = tenant.plan as PlanName;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;

    const contactCount = await prisma.contact.count({
      where: { tenantId: ctx.effectiveTenantId },
    });

    return {
      contacts: {
        used: contactCount,
        limit: limits.maxContacts,
      },
      emails: {
        used: 0, // TODO: track email sends
        limit: limits.maxEmails,
      },
      features: {
        aiTier: limits.aiTier,
        mediaGeneration: limits.mediaGeneration,
        canSaveWorkflows: limits.canSaveWorkflows,
        requiresApproval: limits.requiresApproval,
      },
    };
  }),

  /**
   * Sync plan from Stripe subscription (fallback for when webhooks don't reach local dev).
   * Called after returning from Stripe checkout.
   */
  syncPlan: tenantProcedure.mutation(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: { stripeCustomerId: true, plan: true },
    });

    if (!tenant?.stripeCustomerId) {
      return { plan: tenant?.plan ?? "INICIO", synced: false };
    }

    try {
      // Get the customer's active subscription from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: tenant.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      const sub = subscriptions.data[0];
      if (!sub) {
        return { plan: tenant.plan, synced: false };
      }

      const priceId = sub.items.data[0]?.price?.id;
      if (!priceId) {
        return { plan: tenant.plan, synced: false };
      }

      // Reverse-lookup plan from price ID
      let newPlan: string | null = null;
      for (const [plan, id] of Object.entries(PLAN_PRICES)) {
        if (id === priceId) {
          newPlan = plan;
          break;
        }
      }

      if (newPlan && newPlan !== tenant.plan) {
        await prisma.tenant.update({
          where: { id: ctx.effectiveTenantId },
          data: { plan: newPlan as "INICIO" | "CRECIMIENTO" | "PROFESIONAL" | "AGENCIA" },
        });
        return { plan: newPlan, synced: true };
      }

      return { plan: tenant.plan, synced: false };
    } catch {
      return { plan: tenant.plan, synced: false };
    }
  }),
});
