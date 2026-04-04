import { prisma } from "@nodelabz/db";
import {
  authenticateApiKey,
  requirePermission,
  apiError,
  apiSuccess,
} from "@/server/api/auth";
import {
  generateImage,
  type ImageQuality,
  type ImageSize,
} from "@/server/ai/image-gen";
import { PLAN_LIMITS, type PlanName } from "@/server/stripe/plans";

const VALID_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1024x1792",
  "1792x1024",
];

const VALID_QUALITIES = ["draft", "standard", "premium"];

/**
 * POST /api/v1/ai/generate-image — Generate an AI image
 *
 * Body: { prompt, size?, quality?, style? }
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "ai");

    const body = await request.json();

    if (!body.prompt || typeof body.prompt !== "string") {
      return apiError("prompt is required and must be a string", 400);
    }

    if (body.prompt.length > 2000) {
      return apiError("prompt must be 2000 characters or fewer", 400);
    }

    if (body.size && !VALID_SIZES.includes(body.size)) {
      return apiError(`size must be one of: ${VALID_SIZES.join(", ")}`, 400);
    }

    if (body.quality && !VALID_QUALITIES.includes(body.quality)) {
      return apiError(`quality must be one of: ${VALID_QUALITIES.join(", ")}`, 400);
    }

    // Check plan limits
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { plan: true },
    });

    const plan = (tenant?.plan as PlanName) ?? "INICIO";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;
    const quality: ImageQuality = body.quality ?? limits.imageQuality;

    // Check monthly usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageCount = await prisma.aiMemory.count({
      where: {
        tenantId: auth.tenantId,
        category: "ai_image_gen",
        createdAt: { gte: monthStart },
      },
    });

    if (limits.aiImages !== -1 && usageCount >= limits.aiImages) {
      return apiError(
        "Monthly AI image generation limit reached. Upgrade your plan.",
        403,
      );
    }

    // Generate
    const result = await generateImage({
      prompt: body.prompt,
      quality,
      size: body.size as ImageSize | undefined,
      style: body.style,
    });

    // Log usage
    await prisma.aiMemory.create({
      data: {
        tenantId: auth.tenantId,
        category: "ai_image_gen",
        key: now.toISOString(),
        value: JSON.stringify({
          prompt: body.prompt,
          quality,
          size: body.size ?? "1024x1024",
          url: result.url,
          revisedPrompt: result.revisedPrompt,
          source: "api",
        }),
        source: "api",
      },
    });

    return apiSuccess({
      data: {
        url: result.url,
        revisedPrompt: result.revisedPrompt,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] POST /ai/generate-image error:", error);
    return apiError("Internal server error", 500);
  }
}
