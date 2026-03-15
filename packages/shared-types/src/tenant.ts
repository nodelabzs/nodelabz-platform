import { z } from "zod";

export const planEnum = z.enum(["INICIO", "CRECIMIENTO", "PROFESIONAL", "AGENCIA"]);
export type PlanType = z.infer<typeof planEnum>;

export const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  language: z.enum(["es", "en"]).default("es"),
});

export const permissionsSchema = z.object({
  analytics: z.enum(["full", "view", "none"]).default("none"),
  campaigns: z.enum(["full", "edit", "view", "none"]).default("none"),
  crm: z.enum(["full", "edit", "view", "none"]).default("none"),
  billing: z.enum(["full", "view", "none"]).default("none"),
  team: z.enum(["full", "view", "none"]).default("none"),
  integrations: z.enum(["full", "view", "none"]).default("none"),
  ai: z.enum(["full", "view", "none"]).default("none"),
  reports: z.enum(["full", "edit", "view", "none"]).default("none"),
});

export type Permissions = z.infer<typeof permissionsSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
