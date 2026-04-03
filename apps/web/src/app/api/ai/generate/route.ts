import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";
import { invokeModel } from "@/server/ai/router";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 30_000;

/** Bedrock direct fallback when AI service is unavailable */
async function generateCopyViaBedrock(params: {
  type: string;
  platform?: string;
  context: string;
  language: string;
  tone: string;
}): Promise<{ content: string; variants: string[] }> {
  const platformHint = params.platform ? ` para ${params.platform}` : "";
  const prompt = `Genera un ${params.type}${platformHint} con tono ${params.tone}.
Contexto: ${params.context}

Responde SOLO con JSON valido en este formato exacto (sin markdown, sin backticks):
{"content": "texto principal aqui", "variants": ["variante 1", "variante 2"]}`;

  const raw = await invokeModel({
    message: prompt,
    systemPrompt: `Eres un experto copywriter. Responde siempre en ${params.language === "es" ? "español" : params.language}. Responde SOLO con JSON valido, sin explicaciones ni markdown.`,
    tier: "sonnet",
    maxTokens: 1024,
  });

  try {
    // Extract JSON from response (handle potential wrapping text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        content: parsed.content || raw,
        variants: Array.isArray(parsed.variants) ? parsed.variants : [],
      };
    }
  } catch {
    // If JSON parsing fails, return raw text
  }
  return { content: raw, variants: [] };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await findUserBySupabaseId(user.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { type, platform, context, language, tone } = body;

  if (!type || !context) {
    return Response.json({ error: "type and context are required" }, { status: 400 });
  }

  const copyParams = {
    type,
    platform: platform || undefined,
    context,
    language: language || "es",
    tone: tone || "professional",
  };

  // Try AI service first (if configured)
  if (AI_SERVICE_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let aiResponse: Response;
      try {
        aiResponse = await fetch(`${AI_SERVICE_URL}/generate/copy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Platform-Key": process.env.AI_SERVICE_KEY || "",
          },
          body: JSON.stringify({
            tenant_id: dbUser.tenant.id,
            type,
            platform: platform || null,
            context,
            language: language || "es",
            tone: tone || "professional",
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        return Response.json(data);
      }

      // AI service returned an error — fall through to Bedrock
      console.warn("AI service returned error, falling back to Bedrock:", aiResponse.status);
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      console.warn("AI service unavailable, falling back to Bedrock:", isTimeout ? "timeout" : err);
    }
  }

  // Fallback: call Bedrock directly
  try {
    const result = await generateCopyViaBedrock(copyParams);
    return Response.json(result);
  } catch (bedrockErr) {
    console.error("Bedrock fallback also failed:", bedrockErr);
    return Response.json(
      { error: "El servicio de IA no esta disponible. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
