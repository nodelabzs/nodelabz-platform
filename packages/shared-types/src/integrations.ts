import { z } from "zod";

export const platformEnum = z.enum([
  "meta_ads",
  "google_ads",
  "ga4",
  "tiktok_ads",
  "linkedin",
  "shopify",
  "stripe",
  "whatsapp",
  "mercadolibre",
  "mercadopago",
  "google_search_console",
  "microsoft_clarity",
]);

export const connectIntegrationSchema = z.object({
  platform: platformEnum,
  code: z.string(),
  redirectUri: z.string().url(),
});

export type Platform = z.infer<typeof platformEnum>;
export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>;
