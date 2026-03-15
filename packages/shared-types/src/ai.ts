import { z } from "zod";

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  language: z.enum(["es", "en"]).optional(),
});

export const aiMemoryCategoryEnum = z.enum([
  "business_context",
  "preferences",
  "insights",
  "patterns",
]);

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type AiMemoryCategory = z.infer<typeof aiMemoryCategoryEnum>;
