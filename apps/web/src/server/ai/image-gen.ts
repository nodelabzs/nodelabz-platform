import OpenAI from "openai";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageQuality = "draft" | "standard" | "premium";

export type ImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

export interface GenerateImageParams {
  prompt: string;
  quality: ImageQuality;
  size?: ImageSize;
  style?: "natural" | "vivid";
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt: string;
}

// ---------------------------------------------------------------------------
// OpenAI client (lazy singleton)
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Quality → OpenAI model mapping
// ---------------------------------------------------------------------------

const QUALITY_MODEL_MAP: Record<ImageQuality, string> = {
  draft: "gpt-image-1",   // mini tier via quality param
  standard: "gpt-image-1",
  premium: "gpt-image-1",
};

const QUALITY_PARAM_MAP: Record<ImageQuality, "low" | "medium" | "high"> = {
  draft: "low",
  standard: "medium",
  premium: "high",
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  try {
    return await generateWithOpenAI(params);
  } catch (error) {
    console.error("[image-gen] OpenAI failed, falling back to Titan:", error);
    return await generateWithTitan(params);
  }
}

// ---------------------------------------------------------------------------
// OpenAI GPT Image 1
// ---------------------------------------------------------------------------

async function generateWithOpenAI(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const openai = getOpenAI();

  const response = await openai.images.generate({
    model: QUALITY_MODEL_MAP[params.quality],
    prompt: params.prompt,
    n: 1,
    size: (params.size ?? "1024x1024") as "1024x1024" | "1024x1792" | "1792x1024" | "1536x1024" | "1024x1536",
    quality: QUALITY_PARAM_MAP[params.quality],
  });

  const image = response.data?.[0];
  if (!image?.url && !image?.b64_json) {
    throw new Error("OpenAI returned no image data");
  }

  return {
    url: image.url ?? `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: image.revised_prompt ?? params.prompt,
  };
}

// ---------------------------------------------------------------------------
// AWS Bedrock Titan Image Generator (fallback)
// ---------------------------------------------------------------------------

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

// Titan only supports specific sizes — pick the closest match
function titanSize(size?: ImageSize): { width: number; height: number } {
  switch (size) {
    case "1024x1792":
      return { width: 768, height: 1408 };
    case "1792x1024":
      return { width: 1408, height: 768 };
    case "1024x1536":
      return { width: 768, height: 1152 };
    case "1536x1024":
      return { width: 1152, height: 768 };
    default:
      return { width: 1024, height: 1024 };
  }
}

async function generateWithTitan(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const { width, height } = titanSize(params.size);

  const body = JSON.stringify({
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: params.prompt,
    },
    imageGenerationConfig: {
      numberOfImages: 1,
      width,
      height,
      cfgScale: 8.0,
      seed: Math.floor(Math.random() * 2147483647),
    },
  });

  const command = new InvokeModelCommand({
    modelId: "amazon.titan-image-generator-v2:0",
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  const base64 = result.images?.[0];
  if (!base64) {
    throw new Error("Titan returned no image data");
  }

  return {
    url: `data:image/png;base64,${base64}`,
    revisedPrompt: params.prompt,
  };
}
