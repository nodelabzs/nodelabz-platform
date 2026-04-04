import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { PLAN_LIMITS, PLAN_ORDER, type PlanName } from "@/server/stripe/plans";
import {
  generateImage,
  type ImageQuality,
  type ImageSize,
} from "@/server/ai/image-gen";
import {
  generateVideo,
  checkVideoStatus,
} from "@/server/ai/video-gen";

export const mediaGenRouter = router({
  /**
   * Generate an AI image and log usage against plan limits.
   */
  generateImage: tenantProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(2000),
        quality: z.enum(["draft", "standard", "premium"]).optional(),
        size: z
          .enum(["1024x1024", "1024x1536", "1536x1024", "1024x1792", "1792x1024"])
          .optional(),
        style: z.enum(["natural", "vivid"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.dbUser.tenant.plan ?? "INICIO") as PlanName;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;

      // Determine quality: use plan default if not specified, cap to plan max
      const quality: ImageQuality = input.quality ?? limits.imageQuality;

      // ---- Check monthly usage ----
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageCount = await prisma.aiMemory.count({
        where: {
          tenantId: ctx.effectiveTenantId,
          category: "ai_image_gen",
          createdAt: { gte: monthStart },
        },
      });

      // -1 means unlimited
      if (limits.aiImages !== -1 && usageCount >= limits.aiImages) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Has alcanzado el limite de imagenes de tu plan",
        });
      }

      // ---- Generate ----
      const result = await generateImage({
        prompt: input.prompt,
        quality,
        size: input.size as ImageSize | undefined,
        style: input.style,
      });

      // ---- Log usage ----
      const timestamp = now.toISOString();
      await prisma.aiMemory.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          category: "ai_image_gen",
          key: timestamp,
          value: JSON.stringify({
            prompt: input.prompt,
            quality,
            size: input.size ?? "1024x1024",
            url: result.url,
            revisedPrompt: result.revisedPrompt,
          }),
          source: "media-gen",
        },
      });

      return {
        url: result.url,
        revisedPrompt: result.revisedPrompt,
      };
    }),

  /**
   * Submit a video generation job via Higgsfield.
   * Requires CRECIMIENTO plan or higher (aiVideos > 0).
   */
  generateVideo: tenantProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(1000),
        type: z.enum(["text-to-video", "image-to-video"]),
        imageUrl: z.string().url().optional(),
        duration: z
          .union([z.literal(5), z.literal(10), z.literal(15)])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.dbUser.tenant.plan ?? "INICIO") as PlanName;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;

      // INICIO plan cannot generate videos
      if (PLAN_ORDER[plan] < PLAN_ORDER.CRECIMIENTO) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "La generacion de video requiere plan Crecimiento o superior",
        });
      }

      // Check monthly video quota (unless unlimited = -1)
      if ((limits.aiVideos as number) !== -1) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const videoCount = await prisma.aiMemory.count({
          where: {
            tenantId: ctx.effectiveTenantId,
            category: "ai_video_gen",
            createdAt: { gte: monthStart },
          },
        });

        if (videoCount >= limits.aiVideos) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Has alcanzado el limite de ${limits.aiVideos} videos este mes. Actualiza tu plan para generar mas.`,
          });
        }
      }

      // Validate image-to-video has an imageUrl
      if (input.type === "image-to-video" && !input.imageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Se requiere una URL de imagen para generar video desde imagen",
        });
      }

      // Call Higgsfield API
      const result = await generateVideo({
        prompt: input.prompt,
        type: input.type,
        imageUrl: input.imageUrl,
        duration: input.duration,
      });

      // Log usage in AiMemory
      await prisma.aiMemory.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          category: "ai_video_gen",
          key: result.jobId,
          value: JSON.stringify({
            prompt: input.prompt,
            type: input.type,
            duration: input.duration ?? 5,
            imageUrl: input.imageUrl,
            jobId: result.jobId,
            status: result.status,
            createdBy: ctx.dbUser.id,
          }),
          source: "media-gen",
        },
      });

      return { jobId: result.jobId };
    }),

  /**
   * Check the status of a video generation job.
   */
  checkVideoStatus: tenantProcedure
    .input(
      z.object({
        jobId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const status = await checkVideoStatus(input.jobId);
      return status;
    }),
});
