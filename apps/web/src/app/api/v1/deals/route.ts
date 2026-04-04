import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";
import {
  authenticateApiKey,
  requirePermission,
  apiError,
  apiSuccess,
} from "@/server/api/auth";

/**
 * GET /api/v1/deals — List deals (filterable by pipelineId, stageId, contactId)
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "deals");

    const url = new URL(request.url);
    const pipelineId = url.searchParams.get("pipelineId") || undefined;
    const stageId = url.searchParams.get("stageId") || undefined;
    const contactId = url.searchParams.get("contactId") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: auth.tenantId,
    };

    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.stageId = stageId;
    if (contactId) where.contactId = contactId;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        include: { contact: true, pipeline: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.deal.count({ where }),
    ]);

    return apiSuccess({
      data: deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] GET /deals error:", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/v1/deals — Create a new deal
 *
 * Body: { contactId, pipelineId, title, value?, stageId, probability? }
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "deals");

    const body = await request.json();

    if (!body.contactId || !body.pipelineId || !body.title || !body.stageId) {
      return apiError(
        "contactId, pipelineId, title, and stageId are required",
        400,
      );
    }

    // Verify the contact belongs to this tenant
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, tenantId: auth.tenantId },
    });

    if (!contact) {
      return apiError("Contact not found", 404);
    }

    // Verify pipeline belongs to this tenant
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: body.pipelineId, tenantId: auth.tenantId },
    });

    if (!pipeline) {
      return apiError("Pipeline not found", 404);
    }

    const deal = await prisma.deal.create({
      data: {
        tenantId: auth.tenantId,
        contactId: body.contactId,
        pipelineId: body.pipelineId,
        title: body.title,
        value: body.value != null ? new Prisma.Decimal(body.value) : null,
        stageId: body.stageId,
        probability:
          body.probability != null
            ? Math.min(100, Math.max(0, parseInt(body.probability, 10)))
            : null,
      },
      include: { contact: true, pipeline: true },
    });

    return apiSuccess({ data: deal }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] POST /deals error:", error);
    return apiError("Internal server error", 500);
  }
}
