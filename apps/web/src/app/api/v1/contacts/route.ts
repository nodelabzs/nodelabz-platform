import { prisma } from "@nodelabz/db";
import {
  authenticateApiKey,
  requirePermission,
  apiError,
  apiSuccess,
} from "@/server/api/auth";

/**
 * GET /api/v1/contacts — List contacts (paginated, filterable)
 *
 * Query params: page, limit, search, scoreLabel, source
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "contacts");

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const search = url.searchParams.get("search") || undefined;
    const scoreLabel = url.searchParams.get("scoreLabel") || undefined;
    const source = url.searchParams.get("source") || undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: auth.tenantId,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    if (scoreLabel && ["HOT", "WARM", "COLD"].includes(scoreLabel)) {
      where.scoreLabel = scoreLabel;
    }

    if (source) {
      where.source = source;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.count({ where }),
    ]);

    return apiSuccess({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] GET /contacts error:", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/v1/contacts — Create a new contact
 *
 * Body: { firstName, lastName?, email?, phone?, company?, source?, tags? }
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    requirePermission(auth, "contacts");

    const body = await request.json();

    if (!body.firstName || typeof body.firstName !== "string") {
      return apiError("firstName is required and must be a string", 400);
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: auth.tenantId,
        firstName: body.firstName,
        lastName: body.lastName || null,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        source: body.source || "api",
        tags: Array.isArray(body.tags) ? body.tags : [],
        customData: body.customData || null,
      },
    });

    return apiSuccess({ data: contact }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API v1] POST /contacts error:", error);
    return apiError("Internal server error", 500);
  }
}
