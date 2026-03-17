import { prisma } from "@nodelabz/db";

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:]+/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Retrieve a cached AI response for the given tenant + query.
 * Returns null on cache miss. Increments hit count on cache hit.
 */
export async function getCachedResponse(
  tenantId: string,
  query: string
): Promise<string | null> {
  const key = normalizeQuery(query);

  const cached = await prisma.aiMemory.findUnique({
    where: {
      tenantId_category_key: { tenantId, category: "ai_cache", key },
    },
  });

  if (cached) {
    // Update hit count stored in source field
    await prisma.aiMemory.update({
      where: { id: cached.id },
      data: { source: String(parseInt(cached.source || "0") + 1) },
    });
    return cached.value;
  }

  return null;
}

/**
 * Store an AI response in the semantic cache.
 */
export async function cacheResponse(
  tenantId: string,
  query: string,
  response: string
): Promise<void> {
  const key = normalizeQuery(query);

  await prisma.aiMemory.upsert({
    where: {
      tenantId_category_key: { tenantId, category: "ai_cache", key },
    },
    create: {
      tenantId,
      category: "ai_cache",
      key,
      value: response,
      source: "1",
    },
    update: { value: response },
  });
}
