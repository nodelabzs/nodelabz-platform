export const PLAN_ORDER = {
  INICIO: 0,
  CRECIMIENTO: 1,
  PROFESIONAL: 2,
  AGENCIA: 3,
} as const;

export type PlanName = keyof typeof PLAN_ORDER;

export type ImageQuality = "draft" | "standard" | "premium";

export const PLAN_LIMITS = {
  INICIO: {
    maxContacts: 500,
    maxEmails: 5000,
    aiTier: "haiku" as const,
    mediaGeneration: false,
    canSaveWorkflows: false,
    requiresApproval: false,
    aiImages: 10,
    aiVideos: 0,
    aiReplies: 50,
    brandEditing: false,
    resolution4k: false,
    imageQuality: "draft" as ImageQuality,
  },
  CRECIMIENTO: {
    maxContacts: 5000,
    maxEmails: 25000,
    aiTier: "sonnet" as const,
    mediaGeneration: false,
    canSaveWorkflows: true,
    requiresApproval: true,
    aiImages: 100,
    aiVideos: 5,
    aiReplies: 500,
    brandEditing: false,
    resolution4k: false,
    imageQuality: "standard" as ImageQuality,
  },
  PROFESIONAL: {
    maxContacts: 25000,
    maxEmails: 100000,
    aiTier: "opus" as const,
    mediaGeneration: true,
    canSaveWorkflows: true,
    requiresApproval: false,
    aiImages: 500,
    aiVideos: 20,
    aiReplies: 2000,
    brandEditing: true,
    resolution4k: false,
    imageQuality: "standard" as ImageQuality,
  },
  AGENCIA: {
    maxContacts: -1,
    maxEmails: -1,
    aiTier: "opus" as const,
    mediaGeneration: true,
    canSaveWorkflows: true,
    requiresApproval: false,
    aiImages: -1,
    aiVideos: 50,
    aiReplies: -1,
    brandEditing: true,
    resolution4k: true,
    imageQuality: "premium" as ImageQuality,
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
