import { z } from "zod";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";

export const notificationsRouter = router({
  /**
   * List notifications for the current user (broadcast + user-specific).
   */
  list: tenantProcedure
    .input(
      z
        .object({
          unreadOnly: z.boolean().optional().default(false),
          limit: z.number().min(1).max(100).optional().default(30),
        })
        .optional()
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
        OR: [{ userId: null }, { userId: ctx.dbUser.id }],
      };

      if (input.unreadOnly) {
        where.read = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return notifications;
    }),

  /**
   * Get count of unread notifications for the current user.
   */
  getUnreadCount: tenantProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: {
        tenantId: ctx.effectiveTenantId,
        read: false,
        OR: [{ userId: null }, { userId: ctx.dbUser.id }],
      },
    });

    return { count };
  }),

  /**
   * Mark a single notification as read.
   */
  markRead: tenantProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: {
          id: input.notificationId,
          tenantId: ctx.effectiveTenantId,
        },
        data: { read: true },
      });

      return { success: true };
    }),

  /**
   * Mark all unread notifications as read for the current user.
   */
  markAllRead: tenantProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: {
        tenantId: ctx.effectiveTenantId,
        read: false,
        OR: [{ userId: null }, { userId: ctx.dbUser.id }],
      },
      data: { read: true },
    });

    return { success: true };
  }),

  /**
   * Create a notification (for internal / server-side use).
   */
  create: tenantProcedure
    .input(
      z.object({
        type: z.string(),
        title: z.string(),
        body: z.string(),
        userId: z.string().uuid().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          type: input.type,
          title: input.title,
          body: input.body,
          userId: input.userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: input.metadata as any,
        },
      });

      return notification;
    }),
});
