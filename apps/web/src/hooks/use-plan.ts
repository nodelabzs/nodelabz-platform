"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PLAN_ORDER, PLAN_LIMITS, type PlanName } from "@/server/stripe/plans";

/**
 * Feature-to-minimum-plan mapping.
 * A feature is accessible if the tenant's plan is >= the required plan.
 */
const FEATURE_REQUIREMENTS: Record<string, PlanName> = {
  workflows: "CRECIMIENTO",
  api_keys: "CRECIMIENTO",
  media_generation: "PROFESIONAL",
  broadcasts: "PROFESIONAL",
};

/**
 * Map sidebar nav ids to gated features.
 * Only items that require a plan higher than INICIO are listed here.
 */
export const NAV_FEATURE_MAP: Record<string, string> = {
  automations: "workflows",
  // integrations section's "API Keys" is gated at the detail level;
  // we gate the whole nav item for simplicity here if desired.
};

export function usePlan() {
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();

  const plan = (session?.tenant?.plan ?? "INICIO") as PlanName;

  const isTrialExpired = useMemo(() => {
    if (plan !== "INICIO") return false;
    const trialEndsAt = session?.tenant?.trialEndsAt;
    if (!trialEndsAt) return false;
    return new Date() > new Date(trialEndsAt);
  }, [plan, session?.tenant?.trialEndsAt]);

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;

  /**
   * Check whether the current plan can access a given feature.
   * Returns true if allowed, false if the plan is too low.
   */
  function canAccess(feature: string): boolean {
    const requiredPlan = FEATURE_REQUIREMENTS[feature];
    if (!requiredPlan) return true; // unknown features are unrestricted
    return PLAN_ORDER[plan] >= PLAN_ORDER[requiredPlan];
  }

  /**
   * Get the minimum required plan name for a feature.
   */
  function requiredPlanFor(feature: string): PlanName | null {
    return FEATURE_REQUIREMENTS[feature] ?? null;
  }

  return {
    plan,
    limits,
    isLoading,
    isTrialExpired,
    canAccess,
    requiredPlanFor,
  };
}
