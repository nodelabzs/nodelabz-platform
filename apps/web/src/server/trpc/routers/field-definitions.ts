import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

const fieldTypeEnum = z.enum([
  "TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "BOOLEAN",
  "EMAIL",
  "PHONE",
  "URL",
]);

const entityEnum = z.enum(["Contact", "Deal", "Company"]);

export const fieldDefinitionsRouter = router({
  list: tenantProcedure
    .input(z.object({ entity: entityEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      return prisma.fieldDefinition.findMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          ...(input?.entity && { entity: input.entity }),
        },
        orderBy: { name: "asc" },
      });
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        key: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase alphanumeric with underscores"),
        type: fieldTypeEnum,
        entity: entityEnum,
        options: z.array(z.string()).optional(),
        required: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.fieldDefinition.findUnique({
        where: {
          tenantId_entity_key: {
            tenantId: ctx.effectiveTenantId,
            entity: input.entity,
            key: input.key,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Field "${input.key}" already exists for ${input.entity}`,
        });
      }

      return prisma.fieldDefinition.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          key: input.key,
          type: input.type,
          entity: input.entity,
          options: input.options ?? [],
          required: input.required ?? false,
        },
      });
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        type: fieldTypeEnum.optional(),
        options: z.array(z.string()).optional(),
        required: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const field = await prisma.fieldDefinition.findFirst({
        where: { id: input.id, tenantId: ctx.effectiveTenantId },
      });

      if (!field) throw new TRPCError({ code: "NOT_FOUND" });

      const { id, ...data } = input;
      return prisma.fieldDefinition.update({
        where: { id },
        data: data as object,
      });
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const field = await prisma.fieldDefinition.findFirst({
        where: { id: input.id, tenantId: ctx.effectiveTenantId },
      });

      if (!field) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.fieldDefinition.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
