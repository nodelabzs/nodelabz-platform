import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import {
  generateApiKey,
  hashApiKey,
  maskApiKey,
} from "@/server/api/auth";

const AVAILABLE_SCOPES = [
  "contacts",
  "deals",
  "campaigns",
  "ai",
  "health_score",
  "*",
] as const;

export const apiKeysRouter = router({
  /**
   * Create a new API key. Returns the full key ONCE — it cannot be retrieved again.
   */
  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        permissions: z
          .array(z.string())
          .min(1, "Select at least one permission scope"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      // Limit: max 10 API keys per tenant
      const existingCount = await prisma.aiMemory.count({
        where: { tenantId, category: "api_key" },
      });

      if (existingCount >= 10) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Maximo de 10 API keys por cuenta. Revoca una existente primero.",
        });
      }

      // Generate and hash
      const rawKey = generateApiKey();
      const hashed = hashApiKey(rawKey);

      const value = JSON.stringify({
        name: input.name,
        permissions: input.permissions,
        lastUsedAt: null,
        maskedKey: maskApiKey(rawKey),
      });

      await prisma.aiMemory.create({
        data: {
          tenantId,
          category: "api_key",
          key: hashed,
          value,
          source: "api-keys",
        },
      });

      // Return the full key ONCE
      return {
        key: rawKey,
        name: input.name,
        permissions: input.permissions,
      };
    }),

  /**
   * List all API keys for the current tenant (masked).
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    const records = await prisma.aiMemory.findMany({
      where: {
        tenantId: ctx.effectiveTenantId,
        category: "api_key",
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => {
      const data = JSON.parse(record.value) as {
        name: string;
        permissions: string[];
        lastUsedAt: string | null;
        maskedKey: string;
      };

      return {
        id: record.id,
        name: data.name,
        maskedKey: data.maskedKey,
        permissions: data.permissions,
        lastUsedAt: data.lastUsedAt,
        createdAt: record.createdAt,
      };
    });
  }),

  /**
   * Revoke (delete) an API key.
   */
  revoke: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const record = await prisma.aiMemory.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.effectiveTenantId,
          category: "api_key",
        },
      });

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      await prisma.aiMemory.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Regenerate an API key: revokes old one, creates new one with same name/permissions.
   * Returns the new full key ONCE.
   */
  regenerate: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const record = await prisma.aiMemory.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.effectiveTenantId,
          category: "api_key",
        },
      });

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      const oldData = JSON.parse(record.value) as {
        name: string;
        permissions: string[];
      };

      // Delete old key
      await prisma.aiMemory.delete({ where: { id: input.id } });

      // Create new key
      const rawKey = generateApiKey();
      const hashed = hashApiKey(rawKey);

      const value = JSON.stringify({
        name: oldData.name,
        permissions: oldData.permissions,
        lastUsedAt: null,
        maskedKey: maskApiKey(rawKey),
      });

      await prisma.aiMemory.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          category: "api_key",
          key: hashed,
          value,
          source: "api-keys",
        },
      });

      return {
        key: rawKey,
        name: oldData.name,
        permissions: oldData.permissions,
      };
    }),

  /**
   * Return available permission scopes for the UI.
   */
  availableScopes: tenantProcedure.query(() => {
    return AVAILABLE_SCOPES.map((scope) => ({
      id: scope,
      label:
        scope === "*"
          ? "Todos los permisos"
          : scope === "contacts"
            ? "Contactos"
            : scope === "deals"
              ? "Negocios"
              : scope === "campaigns"
                ? "Campanas"
                : scope === "ai"
                  ? "Inteligencia Artificial"
                  : scope === "health_score"
                    ? "Health Score"
                    : scope,
    }));
  }),
});
