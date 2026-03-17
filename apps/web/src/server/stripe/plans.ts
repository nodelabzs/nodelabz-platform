export const PLAN_ORDER = {
  INICIO: 0,
  CRECIMIENTO: 1,
  PROFESIONAL: 2,
  AGENCIA: 3,
} as const;

export type PlanName = keyof typeof PLAN_ORDER;

export const PLAN_LIMITS = {
  INICIO: {
    maxContacts: 500,
    maxEmails: 5000,
    aiTier: "haiku" as const,
    mediaGeneration: false,
    canSaveWorkflows: false,
    requiresApproval: false,
  },
  CRECIMIENTO: {
    maxContacts: 5000,
    maxEmails: 25000,
    aiTier: "sonnet" as const,
    mediaGeneration: false,
    canSaveWorkflows: true,
    requiresApproval: true,
  },
  PROFESIONAL: {
    maxContacts: 25000,
    maxEmails: 100000,
    aiTier: "opus" as const,
    mediaGeneration: true,
    canSaveWorkflows: true,
    requiresApproval: false,
  },
  AGENCIA: {
    maxContacts: -1,
    maxEmails: -1,
    aiTier: "opus" as const,
    mediaGeneration: true,
    canSaveWorkflows: true,
    requiresApproval: false,
  },
} as const;

export const PLAN_PRICES: Record<PlanName, string> = {
  INICIO: process.env.STRIPE_PRICE_INICIO || "price_placeholder_inicio",
  CRECIMIENTO:
    process.env.STRIPE_PRICE_CRECIMIENTO || "price_placeholder_crec",
  PROFESIONAL:
    process.env.STRIPE_PRICE_PROFESIONAL || "price_placeholder_pro",
  AGENCIA: process.env.STRIPE_PRICE_AGENCIA || "price_placeholder_agencia",
};
