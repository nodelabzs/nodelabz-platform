import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

export type AiTier = "haiku" | "sonnet" | "opus";

const MODEL_IDS: Record<AiTier, string> = {
  haiku: "anthropic.claude-3-5-haiku-20241022-v1:0",
  sonnet: "anthropic.claude-sonnet-4-20250514-v1:0",
  opus: "anthropic.claude-opus-4-20250514-v1:0",
};

/**
 * Rule-based intent classifier to route to the cheapest capable model.
 * Avoids an LLM call for classification itself.
 */
export function classifyIntent(message: string): AiTier {
  const lower = message.toLowerCase();

  // Simple lookups → Haiku
  const simplePatterns = [
    "cuantos",
    "cuantas",
    "total de",
    "lista de",
    "formato",
    "que hora",
    "dame el numero",
  ];
  if (simplePatterns.some((p) => lower.includes(p))) return "haiku";

  // Strategy / generation / cross-domain → Opus
  const complexPatterns = [
    "por que",
    "analiza",
    "estrategia",
    "recomend",
    "optimiz",
    "genera un",
    "crea un workflow",
    "redistribu",
    "predic",
    "compara todos",
  ];
  if (complexPatterns.some((p) => lower.includes(p))) return "opus";

  // Default to Sonnet (mid-tier)
  return "sonnet";
}

/**
 * Invoke a Bedrock model (non-streaming).
 */
export async function invokeModel(params: {
  message: string;
  systemPrompt?: string;
  tier: AiTier;
  maxTokens?: number;
}): Promise<string> {
  const modelId = MODEL_IDS[params.tier];

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: params.maxTokens || 2048,
    system:
      params.systemPrompt ||
      "Eres un asistente de marketing y datos para la plataforma NodeLabz. Responde en español de manera concisa y accionable.",
    messages: [{ role: "user", content: params.message }],
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content?.[0]?.text || "";
}

/**
 * Invoke a Bedrock model with streaming response.
 */
export async function invokeModelStream(params: {
  message: string;
  systemPrompt?: string;
  tier: AiTier;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const modelId = MODEL_IDS[params.tier];

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: params.maxTokens || 2048,
    system:
      params.systemPrompt ||
      "Eres un asistente de marketing y datos para la plataforma NodeLabz. Responde en español.",
    messages: [{ role: "user", content: params.message }],
  });

  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await bedrock.send(command);

  return new ReadableStream({
    async start(controller) {
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(
              new TextDecoder().decode(event.chunk.bytes)
            );
            if (chunk.type === "content_block_delta" && chunk.delta?.text) {
              controller.enqueue(
                new TextEncoder().encode(chunk.delta.text)
              );
            }
          }
        }
      }
      controller.close();
    },
  });
}
