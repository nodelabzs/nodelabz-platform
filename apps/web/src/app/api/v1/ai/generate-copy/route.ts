import { prisma } from "@nodelabz/db";
import {
  authenticateApiKey,
  requirePermission,
  apiError,
  apiSuccess,
} from "@/server/api/auth";
import { invokeModel } from "@/server/ai/router";

const VALID_TYPES = [
  "email_subject",
  "email_body",
  "social_post",
  "ad_copy",
  "landing_page",
  "sms",
  "whatsapp",
  "blog_intro",
  "product_description",
] as const;

const VALID_TONES = [
  "professional",
  "friendly",
  "casual",
  "formal",
  "persuasive",
  "urgent",
] as const;

/**
 * POST /api/v1/ai/generate-copy — Generate marketing copy using AI
 *
 * Body: { type, context, tone?, language? }
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "ai");

    const body = await request.json();

    if (!body.type || typeof body.type !== "string") {
      return apiError(
        `type is required. Valid types: ${VALID_TYPES.join(", ")}`,
        400,
      );
    }

    if (!VALID_TYPES.includes(body.type as typeof VALID_TYPES[number])) {
      return apiError(
        `Invalid type. Valid types: ${VALID_TYPES.join(", ")}`,
        400,
      );
    }

    if (!body.context || typeof body.context !== "string") {
      return apiError("context is required and must be a string describing what the copy is for", 400);
    }

    if (body.context.length > 2000) {
      return apiError("context must be 2000 characters or fewer", 400);
    }

    const tone = body.tone && VALID_TONES.includes(body.tone) ? body.tone : "professional";
    const language = body.language || "es";

    const typeLabels: Record<string, string> = {
      email_subject: "linea de asunto de email",
      email_body: "cuerpo de email de marketing",
      social_post: "publicacion para redes sociales",
      ad_copy: "copy para anuncio publicitario",
      landing_page: "texto para landing page",
      sms: "mensaje SMS de marketing",
      whatsapp: "mensaje de WhatsApp de marketing",
      blog_intro: "introduccion de blog post",
      product_description: "descripcion de producto",
    };

    const prompt = `Genera ${typeLabels[body.type] || body.type}.

Contexto: ${body.context}
Tono: ${tone}
Idioma: ${language === "es" ? "espanol" : language === "en" ? "ingles" : language}

Responde UNICAMENTE con JSON valido, sin markdown:
{
  "copy": "el texto generado aqui",
  "variants": ["variante alternativa 1", "variante alternativa 2"]
}

Reglas:
- El "copy" principal debe ser la mejor version
- Incluye 2 variantes alternativas
- Adapta la longitud al tipo de contenido
- Manten el tono solicitado`;

    const aiResponse = await invokeModel({
      message: prompt,
      tier: "sonnet",
      maxTokens: 1024,
      systemPrompt: "Eres un experto copywriter de marketing. Responde SOLO con JSON valido.",
    });

    // Parse AI response
    const jsonStr = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: { copy: string; variants: string[] };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return raw text as copy
      parsed = { copy: aiResponse.trim(), variants: [] };
    }

    // Log usage
    await prisma.aiMemory.create({
      data: {
        tenantId: auth.tenantId,
        category: "ai_copy_gen",
        key: new Date().toISOString(),
        value: JSON.stringify({
          type: body.type,
          context: body.context,
          tone,
          copy: parsed.copy,
          source: "api",
        }),
        source: "api",
      },
    });

    return apiSuccess({
      data: {
        type: body.type,
        tone,
        copy: parsed.copy,
        variants: parsed.variants || [],
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] POST /ai/generate-copy error:", error);
    return apiError("Internal server error", 500);
  }
}
