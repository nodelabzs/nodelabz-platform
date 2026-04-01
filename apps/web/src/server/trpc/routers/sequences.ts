import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { processSequenceEnrollments } from "@/app/api/cron/process-sequences/route";

const stepSchema = z.object({
  templateId: z.string().uuid(),
  delayHours: z.number().min(0),
});

export const sequencesRouter = router({
  /**
   * List all sequences for the tenant.
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.sequence.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { enrollments: true } } },
    });
  }),

  /**
   * Create a new drip sequence.
   */
  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        steps: z.array(stepSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stepsWithOrder = input.steps.map((step, index) => ({
        order: index,
        templateId: step.templateId,
        delayHours: step.delayHours,
      }));

      return prisma.sequence.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          steps: stepsWithOrder,
        },
      });
    }),

  /**
   * Update a sequence.
   */
  update: tenantProcedure
    .input(
      z.object({
        sequenceId: z.string().uuid(),
        name: z.string().min(1).optional(),
        steps: z.array(stepSchema).min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.sequence.findFirst({
        where: { id: input.sequenceId, tenantId: ctx.effectiveTenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada" });
      }

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (input.steps !== undefined) {
        data.steps = input.steps.map((step, index) => ({
          order: index,
          templateId: step.templateId,
          delayHours: step.delayHours,
        }));
      }

      return prisma.sequence.update({
        where: { id: input.sequenceId },
        data,
      });
    }),

  /**
   * Delete a sequence.
   */
  delete: tenantProcedure
    .input(z.object({ sequenceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.sequence.findFirst({
        where: { id: input.sequenceId, tenantId: ctx.effectiveTenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada" });
      }
      await prisma.sequence.delete({ where: { id: input.sequenceId } });
      return { success: true };
    }),

  /**
   * Enroll contacts into a sequence.
   */
  enroll: tenantProcedure
    .input(
      z.object({
        sequenceId: z.string().uuid(),
        contactIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sequence = await prisma.sequence.findFirst({
        where: { id: input.sequenceId, tenantId: ctx.effectiveTenantId },
      });
      if (!sequence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada" });
      }
      if (!sequence.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La secuencia debe estar activa para inscribir contactos",
        });
      }

      const steps = sequence.steps as Array<{
        order: number;
        templateId: string;
        delayHours: number;
      }>;
      const firstStepDelay = steps[0]?.delayHours || 0;
      const nextSendAt = new Date(Date.now() + firstStepDelay * 60 * 60 * 1000);

      const enrollments = await prisma.sequenceEnrollment.createMany({
        data: input.contactIds.map((contactId) => ({
          sequenceId: input.sequenceId,
          contactId,
          currentStep: 0,
          status: "active",
          nextSendAt,
        })),
        skipDuplicates: true,
      });

      return { enrolled: enrollments.count };
    }),

  /**
   * Get enrollments for a sequence.
   */
  getEnrollments: tenantProcedure
    .input(z.object({ sequenceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sequence = await prisma.sequence.findFirst({
        where: { id: input.sequenceId, tenantId: ctx.effectiveTenantId },
      });
      if (!sequence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada" });
      }

      return prisma.sequenceEnrollment.findMany({
        where: { sequenceId: input.sequenceId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Manually trigger sequence processing for a specific sequence.
   */
  processNow: tenantProcedure
    .input(z.object({ sequenceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sequence = await prisma.sequence.findFirst({
        where: { id: input.sequenceId, tenantId: ctx.effectiveTenantId },
      });
      if (!sequence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada" });
      }

      return processSequenceEnrollments(input.sequenceId);
    }),
});
