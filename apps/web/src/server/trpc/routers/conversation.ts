import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const conversationRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.conversation.findMany({
      where: { tenantId: ctx.effectiveTenantId, userId: ctx.dbUser.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, role: true },
        },
      },
    });
  }),

  get: tenantProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          tenantId: ctx.effectiveTenantId,
          userId: ctx.dbUser.id,
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
      return conversation;
    }),

  saveMessage: tenantProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        role: z.string(),
        content: z.string(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          tenantId: ctx.effectiveTenantId,
          userId: ctx.dbUser.id,
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const message = await prisma.conversationMessage.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata || undefined,
        },
      });

      // Update conversation title from first user message if not set
      if (!conversation.title && input.role === "user") {
        await prisma.conversation.update({
          where: { id: input.conversationId },
          data: { title: input.content.slice(0, 100) },
        });
      }

      return message;
    }),

  create: tenantProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.conversation.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          userId: ctx.dbUser.id,
          title: input.title,
        },
      });
    }),

  delete: tenantProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          tenantId: ctx.effectiveTenantId,
          userId: ctx.dbUser.id,
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.conversation.delete({
        where: { id: input.conversationId },
      });

      return { success: true };
    }),
});
