import crypto from "crypto";
import { prisma } from "@nodelabz/db";

export interface ApiKeyPayload {
  tenantId: string;
  keyId: string;
  permissions: string[];
}

/**
 * Hash an API key using SHA-256 for storage/lookup.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new API key in the format nlab_sk_<32 random hex chars>.
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `nlab_sk_${random}`;
}

/**
 * Mask an API key for display: nlab_sk_****<last 4 chars>.
 */
export function maskApiKey(rawKeyOrHash: string, lastChars = 4): string {
  // If it looks like a raw key, mask it
  if (rawKeyOrHash.startsWith("nlab_sk_")) {
    const suffix = rawKeyOrHash.slice(-lastChars);
    return `nlab_sk_****${suffix}`;
  }
  // Otherwise return a generic mask
  return `nlab_sk_****${rawKeyOrHash.slice(-lastChars)}`;
}

/**
 * Authenticate an incoming request using an API key.
 *
 * Reads the `Authorization: Bearer nlab_sk_xxxx` header,
 * hashes it, and looks up the corresponding AiMemory record
 * with category="api_key".
 *
 * Returns the payload or throws a Response with 401/403.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyPayload> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header. Use: Bearer nlab_sk_xxxx",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const rawKey = authHeader.slice(7).trim();

  if (!rawKey.startsWith("nlab_sk_")) {
    throw new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid API key format",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const hashed = hashApiKey(rawKey);

  // Look up the key in AiMemory where category="api_key" and the stored JSON contains the hash
  const keyRecords = await prisma.aiMemory.findMany({
    where: {
      category: "api_key",
      key: hashed,
    },
  });

  if (keyRecords.length === 0) {
    throw new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid API key",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const record = keyRecords[0]!;
  const data = JSON.parse(record.value) as {
    name: string;
    permissions: string[];
    lastUsedAt: string | null;
  };

  // Update lastUsedAt (fire-and-forget)
  const updatedValue = JSON.stringify({
    ...data,
    lastUsedAt: new Date().toISOString(),
  });

  prisma.aiMemory
    .update({
      where: { id: record.id },
      data: { value: updatedValue },
    })
    .catch(() => {
      /* fire-and-forget */
    });

  return {
    tenantId: record.tenantId,
    keyId: record.id,
    permissions: data.permissions,
  };
}

/**
 * Check if a given API key payload has the required permission scope.
 */
export function requirePermission(
  payload: ApiKeyPayload,
  scope: string,
): void {
  if (!payload.permissions.includes("*") && !payload.permissions.includes(scope)) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden",
        message: `API key does not have the "${scope}" permission`,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Helper to create a JSON error response.
 */
export function apiError(
  message: string,
  status: number,
  details?: unknown,
): Response {
  return new Response(
    JSON.stringify({
      error: status >= 500 ? "Internal Server Error" : "Bad Request",
      message,
      ...(details ? { details } : {}),
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Helper to create a JSON success response.
 */
export function apiSuccess(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
