import { z } from "zod";

export const scoreLabelEnum = z.enum(["HOT", "WARM", "COLD"]);

export const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customData: z.record(z.unknown()).optional(),
});

export const createDealSchema = z.object({
  contactId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  title: z.string().min(1),
  value: z.number().positive().optional(),
  currency: z.enum(["USD", "CRC"]).default("USD"),
  stageId: z.string(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
