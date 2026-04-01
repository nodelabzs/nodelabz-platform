import { z } from "zod";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";

/**
 * Create a notification in the DB.
 * Extracted as a standalone helper so server-side code can call it directly
 * without going through tRPC context.
 *
 * Returns the created notification.  In the future this function can be
 * extended to fan-out to push services (e.g. web-push, email, Slack).
 */
export async function createAndNotify(params: {
  tenantId: string;
  type: string;
  title: string;
  body: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  const notification = await prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      type: params.type,
      title: params.title,
      body: params.body,
      userId: params.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: params.metadata as any,
    },
  });

  // Future: push via web-push, email, Slack webhook, etc.

  return notification;
}

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
   * Lightweight query that returns the timestamp of the newest notification.
   * The client can poll this cheaply (single row, indexed query) and only
   * fetch the full list when the timestamp changes — an ETag-like approach
   * that avoids heavy list queries on every poll cycle.
   */
  lastNotificationAt: tenantProcedure.query(async ({ ctx }) => {
    const latest = await prisma.notification.findFirst({
      where: {
        tenantId: ctx.effectiveTenantId,
        OR: [{ userId: null }, { userId: ctx.dbUser.id }],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return { lastNotificationAt: latest?.createdAt ?? null };
  }),

  /**
   * Polling-friendly subscription query.
   * Input: { since?: Date } — only returns notifications created after `since`.
   * The client polls every ~10 seconds, passing the last `latestAt` value
   * it received. On the first call, omit `since` to get the latest batch.
   *
   * Returns: { notifications, latestAt }
   */
  subscribe: tenantProcedure
    .input(
      z
        .object({
          since: z.coerce.date().optional(),
          limit: z.number().min(1).max(100).optional().default(50),
        })
        .optional()
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
        OR: [{ userId: null }, { userId: ctx.dbUser.id }],
      };

      if (input.since) {
        where.createdAt = { gt: input.since };
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      const latestAt =
        notifications.length > 0 ? notifications[0]!.createdAt : null;

      return { notifications, latestAt };
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
   * Create a notification (for internal / server-side use via tRPC).
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
      const notification = await createAndNotify({
        tenantId: ctx.effectiveTenantId,
        type: input.type,
        title: input.title,
        body: input.body,
        userId: input.userId,
        metadata: input.metadata,
      });

      return notification;
    }),
});
