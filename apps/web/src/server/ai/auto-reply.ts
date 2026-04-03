import { prisma } from "@nodelabz/db";
import { invokeModel } from "./router";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutoReplyParams {
  tenantId: string;
  contactId: string;
  inboundMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

export interface AutoReplyResult {
  reply: string | null;
  shouldReply: boolean;
  scoreLabel?: "HOT" | "WARM" | "COLD";
  suggestDeal?: boolean;
  dealTitle?: string;
  dealValue?: number;
}

// ─── Business context shape stored in AiMemory ─────────────────────────────

interface BusinessContext {
  enabled?: boolean;
  businessName?: string;
  services?: string;
  hours?: string;
  faqs?: string;
  tone?: string;
  language?: string;
  customInstructions?: string;
  createDeals?: boolean;
}

// ─── Main function ──────────────────────────────────────────────────────────

export async function generateAutoReply(
  params: AutoReplyParams
): Promise<AutoReplyResult> {
  const { tenantId, contactId, inboundMessage, conversationHistory } = params;

  // ── 1. Fetch business context from AiMemory ─────────────────────────────
  const memory = await prisma.aiMemory.findUnique({
    where: {
      tenantId_category_key: {
        tenantId,
        category: "business_context",
        key: "default",
      },
    },
  });

  if (!memory) {
    return { shouldReply: false, reply: null };
  }

  let ctx: BusinessContext;
  try {
    ctx = JSON.parse(memory.value) as BusinessContext;
  } catch {
    console.error(
      `[auto-reply] Failed to parse business context for tenant ${tenantId}`
    );
    return { shouldReply: false, reply: null };
  }

  // ── 2. Check if auto-reply is enabled ───────────────────────────────────
  if (ctx.enabled === false) {
    return { shouldReply: false, reply: null };
  }

  // ── 3. Build system prompt ──────────────────────────────────────────────
  const lang = ctx.language || "español";
  const tone = ctx.tone || "profesional y amigable";

  const systemPrompt = `Eres un asistente virtual de atención al cliente para "${ctx.businessName || "la empresa"}".

INSTRUCCIONES ESTRICTAS:
- Responde ÚNICAMENTE con información del contexto de negocio proporcionado abajo.
- Si te preguntan algo que NO está en el contexto, responde exactamente: "No tengo esa información, un asesor te contactará pronto."
- Responde en ${lang} con un tono ${tone}.
- Sé conciso y directo, máximo 2-3 oraciones por respuesta.
- NO inventes información, precios, horarios ni servicios que no estén en el contexto.
- NO digas que eres una IA ni un bot.

CONTEXTO DEL NEGOCIO:
${ctx.services ? `Servicios: ${ctx.services}` : ""}
${ctx.hours ? `Horario de atención: ${ctx.hours}` : ""}
${ctx.faqs ? `Preguntas frecuentes:\n${ctx.faqs}` : ""}
${ctx.customInstructions ? `Instrucciones adicionales: ${ctx.customInstructions}` : ""}

CALIFICACIÓN DEL LEAD:
Después de responder, evalúa la intención de compra del contacto:
- "HOT": pregunta por precios, disponibilidad, quiere agendar, o muestra intención concreta de compra.
- "WARM": hace preguntas generales sobre servicios, muestra curiosidad.
- "COLD": no muestra interés, parece spam, o solo saluda sin preguntar nada relevante.

Si el lead es HOT y su pregunta involucra un servicio concreto, sugiere crear un deal.

FORMATO DE RESPUESTA:
Responde SOLO con un JSON válido (sin markdown, sin backticks):
{
  "reply": "Tu respuesta al cliente aquí",
  "scoreLabel": "HOT" | "WARM" | "COLD",
  "suggestDeal": true | false,
  "dealTitle": "Título del deal si suggestDeal es true",
  "dealValue": 0
}`;

  // ── 4. Build conversation messages ──────────────────────────────────────
  const historyText = conversationHistory
    .map((m) => `${m.role === "user" ? "Cliente" : "Asistente"}: ${m.content}`)
    .join("\n");

  const userMessage = historyText
    ? `Historial de conversación:\n${historyText}\n\nNuevo mensaje del cliente: ${inboundMessage}`
    : `Mensaje del cliente: ${inboundMessage}`;

  // ── 5. Call the AI model ────────────────────────────────────────────────
  const raw = await invokeModel({
    message: userMessage,
    systemPrompt,
    tier: "sonnet",
    maxTokens: 512,
  });

  // ── 6. Parse the AI response ────────────────────────────────────────────
  let parsed: {
    reply?: string;
    scoreLabel?: string;
    suggestDeal?: boolean;
    dealTitle?: string;
    dealValue?: number;
  };

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[auto-reply] Failed to parse AI response:", err, "Raw:", raw);
    return { shouldReply: false, reply: null };
  }

  // ── 7. Validate and return ──────────────────────────────────────────────
  const validLabels = ["HOT", "WARM", "COLD"] as const;
  const scoreLabel = validLabels.includes(
    parsed.scoreLabel as (typeof validLabels)[number]
  )
    ? (parsed.scoreLabel as "HOT" | "WARM" | "COLD")
    : undefined;

  const reply = typeof parsed.reply === "string" && parsed.reply.trim()
    ? parsed.reply.trim()
    : null;

  return {
    shouldReply: reply !== null,
    reply,
    scoreLabel,
    suggestDeal: parsed.suggestDeal === true,
    dealTitle: parsed.dealTitle,
    dealValue:
      typeof parsed.dealValue === "number" && parsed.dealValue > 0
        ? parsed.dealValue
        : undefined,
  };
}
